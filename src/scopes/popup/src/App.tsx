import { Button, Space, Typography } from "antd";

export function App() {
  //  打开侧边栏查看「稍后处理」列表（需用户手势触发，故放在按钮里）
  async function openPanel() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.windowId != null) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  }

  return (
    <div style={{ padding: 16, width: 220 }}>
      <Space direction={"vertical"} size={12} style={{ width: "100%" }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          ig-tool
        </Typography.Title>
        <Button type={"primary"} block onClick={openPanel}>
          打开「稍后处理」列表
        </Button>
      </Space>
    </div>
  );
}
