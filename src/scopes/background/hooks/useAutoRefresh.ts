import { collectMarkedIds } from "@/markSheets";
import { schema, SchemaType } from "@/schema/index";
import { MIN_REFRESH_MINUTES } from "@/schema/settings";
import { useStorageLocal } from "@webextkits/storage-local";

const { getBucket, updateBucket } = useStorageLocal<SchemaType>(schema);

const ALARM_NAME = "mark-auto-refresh";

/* eslint-disable no-console */
//  统一前缀，便于在 service worker 控制台筛选
function log(...args: unknown[]) {
  console.log("[auto-refresh]", ...args);
}

//  按当前设置重建定时器：开启自动刷新且有表格来源时按间隔轮询，否则清除。
async function syncAlarm() {
  const settings = await getBucket("settings");
  await chrome.alarms.clear(ALARM_NAME);
  if (settings.markAutoRefresh && settings.markSheets.length > 0) {
    const minutes = Math.max(MIN_REFRESH_MINUTES, settings.markRefreshMinutes);
    //  periodInMinutes 周期触发；delayInMinutes 让首次也尽快跑一轮
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: minutes,
      periodInMinutes: minutes,
    });
    log(`已开启定时刷新：每 ${minutes} 分钟，来源 ${settings.markSheets.length} 个`);
  } else {
    log(
      `未开启定时刷新（开关=${settings.markAutoRefresh}，来源数=${settings.markSheets.length}）`,
    );
  }
}

//  抓取所有表格、合并去重后写回 markedIds。
//  先在锁外抓取（网络较慢），再用 updateBucket 在排他锁内「重新读取最新设置 + 只改
//  markedIds」，避免覆盖用户此刻在设置页刚保存的 markSheets 等字段（读改写竞态）。
async function refreshNow() {
  const pre = await getBucket("settings");
  if (!pre.markAutoRefresh || pre.markSheets.length === 0) {
    log("触发但已跳过：未开启或无表格来源");
    return;
  }

  log(`开始抓取 ${pre.markSheets.length} 个表格…`);
  const { all, unique, failed, perSheet } = await collectMarkedIds(
    pre.markSheets,
  );
  log("抓取结果:", { perSheet, failed, total: all.length, unique });

  await updateBucket("settings", (settings) => {
    const prev = settings.markedIds;
    const changed =
      prev.length !== unique.length || unique.some((id) => !prev.includes(id));
    if (changed) {
      log(`检测到变化：${prev.length} -> ${unique.length} 个 ID，写入并推送到页面`);
    } else {
      log(`无变化（仍为 ${prev.length} 个 ID），跳过写入`);
    }
    //  返回最新 settings 上只替换 markedIds 的副本；无变化则原样返回。
    //  写入会触发 useMessages 的 onChanged，把更新推送给页面。
    return changed ? { ...settings, markedIds: unique } : settings;
  });
}

//  后台自动刷新：监听设置变化以重建定时器，定时器触发时重新抓取。
export function useAutoRefresh() {
  log("后台自动刷新已加载");
  syncAlarm();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.keys(changes).some((key) => key.includes("settings"))) {
      //  设置变化（含开关/间隔/来源调整）后重建定时器
      log("检测到设置变化，重建定时器");
      syncAlarm();
    }
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      log("定时器触发");
      refreshNow();
    }
  });
}
/* eslint-enable no-console */
