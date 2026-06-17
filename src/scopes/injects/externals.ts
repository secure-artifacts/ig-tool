import * as antd from "antd";
import React from "react";
import ReactDOM from "react-dom";
import ReactDOMClient from "react-dom/client";
import JSXRuntime from "react/jsx-runtime";
import zhCN from "antd/locale/zh_CN";

export default {
  antd: antd,
  react: React,
  "react-dom/client": ReactDOMClient,
  "react-dom": ReactDOM,
  "react/jsx-runtime": JSXRuntime,
  "antd/locale/zh_CN": zhCN,
};
