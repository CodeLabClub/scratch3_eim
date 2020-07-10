const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const RateLimiter = require("../../util/rateLimiter.js");
const formatMessage = require("format-message");
// const io = require("socket.io-client"); // yarn add socket.io-client socket.io-client@2.2.0
const AdapterBaseClient = require("./codelab_adapter_base.js");

// 翻译
const FormHelp = {
    en: "help",
    "zh-cn": "帮助",
};

const FormWebUI = {
    en: "open Adapter Web UI",
    "zh-cn": "打开Adapter控制台",
};

const Form_is_adapter_running = {
    en: "is Adapter running?",
    "zh-cn": "Adapter 已开启?",
}

const Form_whenMessageReceive = {
    en: "when I receive [content]",
    "zh-cn": "当接收到 [content]",
}

const Form_whenAnyMessageReceive = {
    en: "when I receive any message",
    "zh-cn": "当接收到任何消息",
}


const Form_getComingMessage = {
    en: "received message",
    "zh-cn": "收到的消息",
}

const Form_sendMessageAndWait = {
    en: "broadcast [content] and wait",
    "zh-cn": "广播[content]并等待",
}


const Form_sendMessage = {
    en: "broadcast [content]",
    "zh-cn": "广播 [content]",
}


const Form_broadcastMessageAndWait_REPORTER = {
    en: "broadcast [content] and wait",
    "zh-cn": "广播[content]并等待",
}


const Form_control_extension = {
    en: "[turn] [ext_name]",
    "zh-cn": "[turn] [ext_name]",
}


const Form_is_extension_turned_on = {
    en: "is [ext_name] turned on?",
    "zh-cn": "[ext_name]已开启?",
}

const Form_control_node = {
    en: "[turn] [node_name]",
    "zh-cn": "[turn] [node_name]",
}

const Form_is_node_turned_on = {
    en: "is [node_name] turned on?",
    "zh-cn": "[node_name]已开启?",
}

const Form_whenTopicMessageReceive = {
    en: "when I receive [node_id] [content]",
    "zh-cn": "当接收到 [node_id] [content]",
}

const Form_whenAnyTopicMessageReceive = {
    en: "when I receive [node_id] any message",
    "zh-cn": "当接收到 [node_id] 任何消息",
}

const Form_sendTopicMessageAndWait = {
    en: "broadcast [node_id] [content] and wait",
    "zh-cn": "广播[node_id][content]并等待",
}

const Form_sendTopicMessage = {
    en: "broadcast [node_id] [content]",
    "zh-cn": "广播[node_id][content]",
}


const Form_sendTopicMessageAndWait_REPORTER = {
    en: "broadcast [node_id] [content] and wait",
    "zh-cn": "广播[node_id][content]并等待",
}

const Form_trust_adapter_host = {
    en: "trust adapter host[adapter_host]",
    "zh-cn": "信任[adapter_host]",
}

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI =
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTkycHQiIGhlaWdodD0iMTczcHQiIHZpZXdCb3g9IjAgMCAxOTIgMTczIiB2ZXJzaW9uPSIxLjEiPgo8ZyBpZD0ic3VyZmFjZTEiPgo8cGF0aCBzdHlsZT0iIHN0cm9rZTpub25lO2ZpbGwtcnVsZTpldmVub2RkO2ZpbGw6cmdiKDEwMCUsNzIuMTU2ODYzJSwxMS43NjQ3MDYlKTtmaWxsLW9wYWNpdHk6MTsiIGQ9Ik0gMTEyLjgwNDY4OCAxMzYuMzE2NDA2IEMgODMuNTQ2ODc1IDExNi41MzEyNSA3Ni4yMTQ4NDQgOTQuMzYzMjgxIDkwLjgwODU5NCA2OS44MDg1OTQgQyAxMTIuNjk1MzEyIDMyLjk4MDQ2OSAxMjQuMTEzMjgxIDE5LjI0MjE4OCAxMjAuNDQ5MjE5IDAuMTg3NSBDIDEzNC44NzUgMTYuOTIxODc1IDE3Ni40MTc5NjkgNjIuNTAzOTA2IDEzMS43ODkwNjIgMTE1LjQwNjI1IEMgMTMxLjc4OTA2MiA5NC44NjMyODEgMTI3LjA5Mzc1IDgzLjI0NjA5NCAxMTcuNjk5MjE5IDgwLjU0Njg3NSBDIDExMS4yNDIxODggODguMjg5MDYyIDEwOC4wMTE3MTkgOTguMTg3NSAxMDguMDExNzE5IDExMC4yMzgyODEgQyAxMDguMDExNzE5IDEyMi4yOTI5NjkgMTA5LjYwOTM3NSAxMzAuOTg0Mzc1IDExMi44MDQ2ODggMTM2LjMxNjQwNiBaIE0gMTEyLjgwNDY4OCAxMzYuMzE2NDA2ICIvPgo8cGF0aCBzdHlsZT0iIHN0cm9rZTpub25lO2ZpbGwtcnVsZTpldmVub2RkO2ZpbGw6cmdiKDIzLjEzNzI1NSUsMjQuNzA1ODgyJSwyNi42NjY2NjclKTtmaWxsLW9wYWNpdHk6MTsiIGQ9Ik0gMC40MTAxNTYgMTU1LjEzNjcxOSBDIDEuMjIyNjU2IDE1MC4yNDIxODggMy4yOTY4NzUgMTQ2LjQ3NjU2MiA2LjU1ODU5NCAxNDMuNTM5MDYyIEMgMTAuNjMyODEyIDEzOS44NTE1NjIgMTUuODk0NTMxIDEzNC40MjU3ODEgMjEuNTI3MzQ0IDEzNi45ODgyODEgQyAyMi40MTc5NjkgMTM3LjM2MzI4MSAyMy4wMDc4MTIgMTM4LjM0Mzc1IDIyLjQ5MjE4OCAxMzkuOTI1NzgxIEMgMjAuOTMzNTk0IDE0NC41MTk1MzEgMTYuNzg1MTU2IDE0NC4yMTg3NSAxMy4yMjY1NjIgMTQ2Ljg1MTU2MiBDIDEwLjI2NTYyNSAxNDkuMTg3NSA3LjY3MTg3NSAxNTIuMTk5MjE5IDcuNDQ5MjE5IDE1NS44OTA2MjUgQyA3LjMwMDc4MSAxNTggNy42NzE4NzUgMTYwLjg1OTM3NSA5LjAwMzkwNiAxNjIuODk0NTMxIEMgMTAuNTU4NTk0IDE2NS4zNzg5MDYgMTMuMjI2NTYyIDE2NS42Nzk2ODggMTUuODIwMzEyIDE2Ni42NjAxNTYgQyAxOS43NSAxNjguMTY0MDYyIDIyLjM0Mzc1IDE2Mi43NDIxODggMjUuNjAxNTYyIDE2Mi41OTM3NSBDIDI4Ljg2MzI4MSAxNjIuMzY3MTg4IDI2Ljc4OTA2MiAxNjcuMTA5Mzc1IDI2LjA0Njg3NSAxNjguMzE2NDA2IEMgMjIuMzQzNzUgMTc0LjExMzI4MSAxNS40NDkyMTkgMTczLjI4NTE1NiA5Ljc0NjA5NCAxNzEuNjI4OTA2IEMgMi44NTU0NjkgMTY5LjU5NzY1NiAtMC43NzczNDQgMTYyLjU5Mzc1IDAuNDEwMTU2IDE1NS4xMzY3MTkgWiBNIDM1LjA1ODU5NCAxNjguNjc5Njg4IEMgMzAuMDE5NTMxIDE2NS42Njc5NjkgMjcuODcxMDk0IDE1OS4zMzk4NDQgMjkuNSAxNTMuNjE3MTg4IEMgMzAuNjg3NSAxNDkuNDAyMzQ0IDMzLjM1NTQ2OSAxNDcuMjE0ODQ0IDM0LjI0MjE4OCAxNDUuMTA5Mzc1IEMgMzYuMDIzNDM4IDE0MS4wNDI5NjkgNDEuMjEwOTM4IDE0Mi4yNDYwOTQgNDQuMDIzNDM4IDE0NS40MTAxNTYgQyA0NS45NTMxMjUgMTQ3LjY2Nzk2OSA0Ni45ODgyODEgMTUwLjIzMDQ2OSA0Ny42NTYyNSAxNTIuNzg5MDYyIEMgNDkuMjEwOTM4IDE1OC43MzgyODEgNDYuNDcyNjU2IDE2My43ODUxNTYgNDIuNTQyOTY5IDE2OCBDIDQwLjkxNDA2MiAxNjkuNzM0Mzc1IDM3LjA1ODU5NCAxNjkuODA4NTk0IDM1LjA1ODU5NCAxNjguNjc5Njg4IFogTSAzNy40Mjk2ODggMTYxLjIyMjY1NiBDIDQyLjc2NTYyNSAxNjIuNDI5Njg4IDQzLjI4NTE1NiAxNTUuMTk5MjE5IDM5LjI4MTI1IDE1MC43NTc4MTIgQyAzNy42NTIzNDQgMTQ5LjAyMzQzOCAyOS42NDg0MzggMTU5LjQxNzk2OSAzNy40Mjk2ODggMTYxLjIyMjY1NiBaIE0gNTQuMzYzMjgxIDE1Ni4wMjczNDQgQyA1NC4zNjMyODEgMTQ2LjYxMzI4MSA2NS43NzM0MzggMTQ1LjE4MzU5NCA3MS40ODA0NjkgMTQwLjUxNTYyNSBDIDczLjI1NzgxMiAxMzkuMDA3ODEyIDcyLjUxNTYyNSAxMzUuMDkzNzUgNzMuNjI4OTA2IDEzMi41MzEyNSBDIDc0LjY2Nzk2OSAxMzAuNzIyNjU2IDc2LjgxNjQwNiAxMjkuMjE4NzUgNzguNTkzNzUgMTI5Ljk3MjY1NiBDIDc5LjMzNTkzOCAxMzAuMzQ3NjU2IDgxLjAzOTA2MiAxMzEuNDc2NTYyIDgwLjc0MjE4OCAxMzIuOTA2MjUgQyA3Ni40NDUzMTIgMTQ0LjgwODU5NCA3Ni44MTY0MDYgMTU3LjgzNTkzOCA3OC45NjQ4NDQgMTcwLjU2MjUgQyA3OC45NjQ4NDQgMTcxLjIzODI4MSA3Ny4xODc1IDE3Mi4zNzEwOTQgNzYuMDc0MjE5IDE3Mi4zNzEwOTQgQyA3Mi44ODY3MTkgMTcyLjc0NjA5NCA3Mi44ODY3MTkgMTY4IDcxLjEwOTM3NSAxNjcuNjI1IEMgNjguMjE4NzUgMTY3LjYyNSA2NS4zMjgxMjUgMTY4LjQ1MzEyNSA2Mi41ODU5MzggMTY2LjU3MDMxMiBDIDU4Ljk1NzAzMSAxNjQuMDg1OTM4IDU0LjM2MzI4MSAxNjEuNTIzNDM4IDU0LjM2MzI4MSAxNTYuMDI3MzQ0IFogTSA2MS44NDc2NTYgMTU0Ljk3MjY1NiBDIDYyLjM2NzE4OCAxNTguNTg5ODQ0IDY2LjQ0MTQwNiAxNjIuMjAzMTI1IDcwLjM2NzE4OCAxNjAuNzczNDM4IEMgNjkuNzAzMTI1IDE1Ni40MDIzNDQgNzEuMTA5Mzc1IDE1Mi40MTQwNjIgNzEuMTA5Mzc1IDE0OC4xMjEwOTQgQyA2Ny4xODM1OTQgMTQ4LjEyMTA5NCA2MS4xMDU0NjkgMTUwLjMwNDY4OCA2MS44NDc2NTYgMTU0Ljk3MjY1NiBaIE0gODUuNzQ2MDk0IDE1MS42NjAxNTYgQyA4NS41OTc2NTYgMTQ0LjIwMzEyNSA5MS4wMDM5MDYgMTM4Ljc4MTI1IDk4LjI2NTYyNSAxMzkuODM1OTM4IEMgMTA0LjA0Njg3NSAxNDAuNjY0MDYyIDEwOS4zMDg1OTQgMTQ2LjMxMjUgMTA5LjIzNDM3NSAxNTIuNjQwNjI1IEMgMTA4LjA1MDc4MSAxNTYuMjUzOTA2IDk5Ljc1IDE1OS4zMzk4NDQgOTYuOTMzNTk0IDE2Mi4wNTA3ODEgQyA5Ni42MzY3MTkgMTYyLjEyODkwNiA5NS4zMDQ2ODggMTYyLjg3ODkwNiA5NS43NSAxNjMuNjMyODEyIEMgOTguMzM5ODQ0IDE2OC4yMjY1NjIgMTAzLjA4NTkzOCAxNjYuMTk1MzEyIDEwNy4yMzQzNzUgMTY0LjAxMTcxOSBDIDEwOS45MDIzNDQgMTY1Ljk2ODc1IDEwOC40OTIxODggMTcwLjQ4ODI4MSAxMDUuNDU3MDMxIDE3MC45Mzc1IEMgMTAyLjEyMTA5NCAxNzEuNDY0ODQ0IDk4LjQ4ODI4MSAxNzIuMzcxMDk0IDk0LjkzMzU5NCAxNzAuNzg5MDYyIEMgODcuNTIzNDM4IDE2Ny4zOTg0MzggODUuODk0NTMxIDE1OC44OTA2MjUgODUuNzQ2MDk0IDE1MS42NjAxNTYgWiBNIDkzLjgyMDMxMiAxNTUuNSBDIDk3LjMwNDY4OCAxNTUuMzUxNTYyIDEwMC43MTQ4NDQgMTU0LjM3MTA5NCAxMDEuODI0MjE5IDE1MC43NTc4MTIgQyAxMDMuNDUzMTI1IDE0Ni45OTIxODggOTcuMzA0Njg4IDE0NS4wMzEyNSA5NC4zMzk4NDQgMTQ2LjYxMzI4MSBDIDkxLjA3ODEyNSAxNDguMzQ3NjU2IDkyLjA0Mjk2OSAxNTUuMzUxNTYyIDkzLjgyMDMxMiAxNTUuNSBaIE0gMTQ5LjgzMjAzMSAxNzEuOTQxNDA2IEMgMTQ4LjQ5MjE4OCAxNzEuMjUgMTQ4LjIyMjY1NiAxNjkuMzg2NzE5IDE0Ny4xOTE0MDYgMTY5LjQ5NjA5NCBDIDE0MS44NTU0NjkgMTY5LjA3MDMxMiAxMzUuOTkyMTg4IDE2OS45OTIxODggMTMyLjUxOTUzMSAxNjUuMjg1MTU2IEMgMTMwLjI0NjA5NCAxNjIuODAwNzgxIDEzMC41IDE1Ny4zOTQ1MzEgMTMyLjA4MjAzMSAxNTQuNzMwNDY5IEMgMTM3LjE5NTMxMiAxNDUuOTM3NSAxNDcuODU1NDY5IDE0Ny4zOTA2MjUgMTQ3Ljk4MDQ2OSAxNDcuMTQ4NDM4IEMgMTQ4LjUzMTI1IDE0Ni4wMzEyNSAxNDguNjIxMDk0IDE0Mi42MTMyODEgMTQ2Ljk2ODc1IDE0Mi40ODQzNzUgQyAxNDIuNTE5NTMxIDE0MS45Njg3NSAxNDAuMDAzOTA2IDE0NC4yNzczNDQgMTM2LjIzODI4MSAxNDYuMDM5MDYyIEMgMTMzLjQwMjM0NCAxNDcuMzk4NDM4IDEzMi4xMDE1NjIgMTQxLjQwMjM0NCAxMzIuNjk1MzEyIDE0MC42NTYyNSBDIDEzNy42MTcxODggMTM2LjQyOTY4OCAxNDguMzc1IDEzMy4xNzU3ODEgMTUyLjQyOTY4OCAxMzkuODYzMjgxIEMgMTU2LjA0Njg3NSAxNDUuOTE3OTY5IDE1My4xNzU3ODEgMTUyLjY2MDE1NiAxNTMuMzkwNjI1IDE1OS42Nzk2ODggQyAxNTMuNTc0MjE5IDE2NC4yNzczNDQgMTU0LjE3NTc4MSAxNzQuMjg1MTU2IDE0OS44MzIwMzEgMTcxLjk0MTQwNiBaIE0gMTQ2LjY2MDE1NiAxNjMuNDg0Mzc1IEMgMTQ3LjMyODEyNSAxNTkuNjQwNjI1IDE0OS4yNTM5MDYgMTU3LjA4MjAzMSAxNDcuNjI1IDE1My4wODk4NDQgQyAxNDMuMzI0MjE5IDE1NC43NDYwOTQgMTM1LjgzOTg0NCAxNTMuNDY4NzUgMTM1LjY5MTQwNiAxNTkuOTQ1MzEyIEMgMTM1LjYxNzE4OCAxNjMuMjU3ODEyIDE0Ni4wNjY0MDYgMTY0LjkxNDA2MiAxNDYuNjYwMTU2IDE2My40ODQzNzUgWiBNIDE2Ny43MzgyODEgMTcwLjc4OTA2MiBDIDE2Ni45OTYwOTQgMTcwLjYzNjcxOSAxNjYuMTc5Njg4IDE2OS4yMDcwMzEgMTY1LjgxMjUgMTY4LjM3ODkwNiBDIDE2NC45OTYwOTQgMTYxLjMwMDc4MSAxNjUuODEyNSAxNTQuNTk3NjU2IDE2NC4yNTM5MDYgMTQ3LjUxOTUzMSBDIDE2My44MDg1OTQgMTQ2LjMxMjUgMTYyLjY5OTIxOSAxNDQuNzMwNDY5IDE2My4wNzAzMTIgMTQzLjE0ODQzOCBDIDE2My40NDE0MDYgMTQyLjM5ODQzOCAxNjQuMjUzOTA2IDE0MS45NDUzMTIgMTY0LjYyNSAxNDEuMTkxNDA2IEMgMTY0Ljk5NjA5NCAxMzYuNDQ5MjE5IDE2My45NTcwMzEgMTMxLjc3NzM0NCAxNjQuOTk2MDk0IDEyNi45NTcwMzEgQyAxNjUuNTE1NjI1IDEyNC42MjUgMTY4LjkyMTg3NSAxMjEuMDg1OTM4IDE3MC44NTE1NjIgMTIzLjc5Njg3NSBDIDE3NS4wNzQyMTkgMTI4LjE2NDA2MiAxNjguOTIxODc1IDEzNC40ODgyODEgMTcxLjk2MDkzOCAxMzkuOTg4MjgxIEMgMTgwLjE4NzUgMTQwLjM2MzI4MSAxODguNzA3MDMxIDE0My41MjczNDQgMTkxLjM3NSAxNTEuNDMzNTk0IEMgMTkzLjAwNzgxMiAxNTYuMTc5Njg4IDE4OS44MjAzMTIgMTYxLjY3NTc4MSAxODUuOTY0ODQ0IDE2NC40NjA5MzggQyAxODAuNTU4NTk0IDE2OC4zNzg5MDYgMTc0LjMzMjAzMSAxNzEuOTkyMTg4IDE2Ny43MzgyODEgMTcwLjc4OTA2MiBaIE0gMTczLjE0ODQzOCAxNjMuMjU3ODEyIEMgMTcxLjIxODc1IDE1Ny43NTc4MTIgMTcxLjIxODc1IDE1MS44MDg1OTQgMTcxLjIxODc1IDE0Ni4zMTI1IEMgMTc2LjYyODkwNiAxNDUuNTU4NTk0IDE4NC42MzI4MTIgMTQ5LjA5NzY1NiAxODQuNzgxMjUgMTU0LjIxODc1IEMgMTg1LjAwMzkwNiAxNTkuNzE4NzUgMTc4LjE4NzUgMTYyLjg3ODkwNiAxNzMuMTQ4NDM4IDE2My4yNTc4MTIgWiBNIDEyMC42ODc1IDE3MS4yMzQzNzUgQyAxMTguMDM1MTU2IDE3MS4yMzQzNzUgMTE1LjIyNjU2MiAxNjguOTQ5MjE5IDExNS44MTY0MDYgMTYzLjk2MDkzOCBDIDExNi40MTAxNTYgMTU4Ljk3NjU2MiAxMTYuNjgzNTk0IDE2MS41IDExNy4yOTI5NjkgMTUyLjI3NzM0NCBDIDExNy44OTg0MzggMTQzLjA1NDY4OCAxMTcuMjkyOTY5IDEzNC44OTQ1MzEgMTE3LjI5Mjk2OSAxMjguNjI4OTA2IEMgMTE3LjI5Mjk2OSAxMjIuMzYzMjgxIDEwOC4yODkwNjIgMTA0Ljc4NTE1NiAxMjAuNzE0ODQ0IDEwNC43ODUxNTYgQyAxMjYuNDAyMzQ0IDEwNy4wNTg1OTQgMTIzLjU1MDc4MSAxMTMuMDQ2ODc1IDEyMy41NTA3ODEgMTE4LjUzMTI1IEMgMTIzLjU1MDc4MSAxMjQuODAwNzgxIDEyMy41NTA3ODEgMTI3LjQxMDE1NiAxMjMuNTUwNzgxIDEzMC43OTY4NzUgQyAxMjMuNTUwNzgxIDEzNC4xODc1IDEyMy41NTA3ODEgMTQ2LjYwNTQ2OSAxMjMuNTUwNzgxIDE1NS40ODA0NjkgQyAxMjMuNTUwNzgxIDE2NC4zNTU0NjkgMTIzLjM0Mzc1IDE3MS4yMzQzNzUgMTIwLjY4NzUgMTcxLjIzNDM3NSBaIE0gMTIwLjY4NzUgMTcxLjIzNDM3NSAiLz4KPC9nPgo8L3N2Zz4K";
const menuIconURI = blockIconURI;

const NODE_ID = "eim";
const HELP_URL = "https://adapter.codelab.club/extension_guide/eim/";

// EIM: Everything Is Message
// EIM 与 webui client 的区别: EIM 不关心关于环境的信息

class EIMClient {
    update_nodes_status(nodes_status) {
        this.exts_statu = nodes_status["exts_status_and_info"];
        this.nodes_statu = nodes_status["node_status_and_info"];
        console.log("this.exts_statu ->", this.exts_statu);
    }

    node_statu_change_callback(extension_node_name, content) {
        const status_checked_map = { start: true, stop: false };
        if (extension_node_name.startsWith("extension_")) {
            this.exts_statu[extension_node_name]["is_running"] =
                status_checked_map[content];
            console.log(`extension statu change to ${content}`);
        }
        if (extension_node_name.startsWith("node_")) {
            this.nodes_statu[extension_node_name]["is_running"] =
                status_checked_map[content];
            console.log(`node statu change to ${content}`);
        }
    }

    onAdapterPluginMessage(msg) {
        this.adapter_node_content_hat = msg.message.payload.content; // todo topic
        this.adapter_node_content_reporter = msg.message.payload.content;
        this.node_id = msg.message.payload.node_id;
    }

    constructor(node_id, help_url) {
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;
        const SendRateMax = 10;
        this._rateLimiter = new RateLimiter(SendRateMax);

        // eim
        this.exts_statu = {};
        this.nodes_statu = {};

        this.adapter_base_client = new AdapterBaseClient(
            null, // onConnect,
            null, // onDisconnect,
            null, // onMessage,
            this.onAdapterPluginMessage.bind(this), // onAdapterPluginMessage,
            this.update_nodes_status.bind(this), // update_nodes_status,
            this.node_statu_change_callback.bind(this), // node_statu_change_callback,
            null, // notify_callback,
            null, // error_message_callback,
            null // update_adapter_status
        );
    }

    emit_with_messageid(node_id, content) {
        // 包装adapter client emit， 添加 rateLimiter
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();
        return this.adapter_base_client.emit_with_messageid(node_id, content);
    }

    emit_with_messageid_for_control(node_id, content, node_name, pluginType) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();
        return this.adapter_base_client.emit_with_messageid_for_control(
            node_id,
            content,
            node_name,
            pluginType
        );
    }

    emit_without_messageid(node_id, content) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();
        this.adapter_base_client.emit_without_messageid(node_id, content);
    }

    isTargetMessage(content) {
        // 是逻辑判断
        if (
            this.adapter_node_content_hat &&
            (content === this.adapter_node_content_hat || content === "_any")
        ) {
            // 1/100秒后清除
            setTimeout(() => {
                this.adapter_node_content_hat = null; // 每次清空
            }, 1); //ms， 1/1000s ，只有一个通道 可能会覆盖消息。
            return true;
        }
    }

    isTargetTopicMessage(targerNodeId, targetContent) {
        if (
            (targetContent === this.adapter_node_content_hat || targetContent === "_any") &&
            targerNodeId === this.node_id
        ) {
            setTimeout(() => {
                this.adapter_node_content_hat = null; // 每次清空
                this.node_id = null;
            }, 1); //ms
            return true;
        }
    }

    formatExtension() {
        // text value list
        console.debug("formatExtension exts_statu -> ", this.exts_statu)
        if (this.exts_statu && Object.keys(this.exts_statu).length) {
            // window.extensions_statu = this.exts_statu;
            let extensions = Object.keys(this.exts_statu).map((ext_name) => ({
                text: ext_name,
                value: ext_name,
            }));
            return extensions;
        }
        return [
            {
                text: "extension_eim",
                value: "extension_eim",
            },
        ];
    }

    formatNode() {
        // text value list
        if (this.nodes_statu && Object.keys(this.nodes_statu).length) {
            let nodes = Object.keys(this.nodes_statu).map((node_name) => ({
                text: node_name,
                value: node_name,
            }));
            return nodes;
        }
        return [
            {
                text: "node_eim",
                value: "node_eim",
            },
        ];
    }
}


class EIMBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.eim_client = new EIMClient(NODE_ID, HELP_URL);
    }

    /**
     * The key to load & store a target's test-related state.
     * @type {string}
     */
    static get STATE_KEY() {
        return "Scratch.eim";
    }

    _setLocale() {
        let now_locale = "";
        switch (formatMessage.setup().locale) {
            case "en":
                now_locale = "en";
                break;
            case "zh-cn":
                now_locale = "zh-cn";
                break;
            default:
                now_locale = "zh-cn";
                break;
        }
        return now_locale;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        let the_locale = this._setLocale();
        return {
            id: NODE_ID,
            name: "EIM",
            menuIconURI: menuIconURI,
            blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: "open_help_url",
                    blockType: BlockType.COMMAND,
                    text: FormHelp[the_locale],
                    arguments: {},
                },
                //FormWebUI
                {
                    opcode: "openWebUI",
                    blockType: BlockType.COMMAND,
                    text: FormWebUI[the_locale],
                    arguments: {},
                },
                {
                    opcode: "is_adapter_running",
                    blockType: BlockType.BOOLEAN,
                    text: Form_is_adapter_running[the_locale],
                    arguments: {
                    },
                },
                {
                    opcode: "whenMessageReceive",
                    blockType: BlockType.HAT,
                    text: Form_whenMessageReceive[the_locale],
                    arguments: {
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello",
                        },
                    },
                },
                {
                    opcode: "whenAnyMessageReceive",
                    blockType: BlockType.HAT,
                    text: Form_whenAnyMessageReceive[the_locale],
                    arguments: {},
                },
                {
                    opcode: "getComingMessage",
                    blockType: BlockType.REPORTER, // BOOLEAN, COMMAND
                    text: Form_getComingMessage[the_locale],
                    arguments: {},
                },
                // 优先推荐wait模式（同步）
                {
                    opcode: "broadcastMessageAndWait",
                    blockType: BlockType.COMMAND,
                    text: Form_sendMessageAndWait[the_locale],
                    arguments: {
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello",
                        },
                    },
                },
                {
                    opcode: "broadcastMessage",
                    blockType: BlockType.COMMAND,
                    text: Form_sendMessage[the_locale],
                    arguments: {
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello",
                        },
                    },
                },
                {
                    opcode: "broadcastMessageAndWait_REPORTER",
                    blockType: BlockType.REPORTER,
                    text: Form_broadcastMessageAndWait_REPORTER[the_locale],
                    arguments: {
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello",
                        },
                    },
                },
                {
                    opcode: "control_extension",
                    blockType: BlockType.COMMAND,
                    text: Form_control_extension[the_locale],
                    arguments: {
                        turn: {
                            type: ArgumentType.STRING,
                            defaultValue: "start",
                            menu: "turn",
                        },
                        ext_name: {
                            type: ArgumentType.STRING,
                            defaultValue: "extension_eim",
                            menu: "exts_name",
                        },
                    },
                },
                {
                    opcode: "is_extension_turned_on",
                    blockType: BlockType.BOOLEAN,
                    text: Form_is_extension_turned_on[the_locale],
                    arguments: {
                        ext_name: {
                            type: ArgumentType.STRING,
                            defaultValue: "extension_eim",
                            menu: "exts_name",
                        },
                    },
                },
                {
                    opcode: "control_node",
                    blockType: BlockType.COMMAND,
                    text: Form_control_node[the_locale],
                    arguments: {
                        turn: {
                            type: ArgumentType.STRING,
                            defaultValue: "start",
                            menu: "turn",
                        },
                        node_name: {
                            type: ArgumentType.STRING,
                            defaultValue: "node_eim",
                            menu: "nodes_name",
                        },
                    },
                },
                {
                    opcode: "is_node_turned_on",
                    blockType: BlockType.BOOLEAN,
                    text: Form_is_node_turned_on[the_locale],
                    arguments: {
                        node_name: {
                            type: ArgumentType.STRING,
                            defaultValue: "node_eim",
                            menu: "nodes_name",
                        },
                    },
                },
                {
                    opcode: "whenTopicMessageReceive",
                    blockType: BlockType.HAT,
                    text: Form_whenTopicMessageReceive[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        },
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "3",
                        },
                    },
                },
                {
                    opcode: "whenAnyTopicMessageReceive",
                    blockType: BlockType.HAT,
                    text: Form_whenAnyTopicMessageReceive[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        },
                    },
                },
                {
                    opcode: "broadcastTopicMessageAndWait",
                    blockType: BlockType.COMMAND,
                    text: Form_sendTopicMessageAndWait[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        },
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "1+2",
                        },
                    },
                },
                {
                    opcode: "broadcastTopicMessage",
                    blockType: BlockType.COMMAND,
                    text: Form_sendTopicMessage[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        },
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "1+2",
                        },
                    },
                },
                {
                    opcode: "broadcastTopicMessageAndWait_REPORTER",
                    blockType: BlockType.REPORTER,
                    text: Form_sendTopicMessageAndWait_REPORTER[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        },
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "1+2",
                        },
                    },
                },
                {
                    opcode: "trust_adapter_host",
                    blockType: BlockType.COMMAND,
                    text: Form_trust_adapter_host[the_locale],
                    arguments: {
                        adapter_host: {
                            type: ArgumentType.STRING,
                            defaultValue: `${this.eim_client.adapter_base_client.adapterHost}`, //'https://raspberrypi.local:12358'
                        },
                    },
                },
            ],
            menus: {
                // todo 动态
                exts_name: "_formatExtension",
                nodes_name: "_formatNode",
                turn: {
                    acceptReporters: true,
                    items: ["start", "stop"],
                },
            },
        };
    }

    _formatExtension() {
        return this.eim_client.formatExtension();
    }
    _formatNode() {
        return this.eim_client.formatNode();
    }
    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */

    trust_adapter_host(args) {
        const adapter_host = args.adapter_host;
        window.open(`https://${adapter_host}:12358`);
    }

    open_help_url(args) {
        window.open(HELP_URL);
    }

    openWebUI(args) {
        window.open("https://codelab-adapter.codelab.club:12358/");
    }

    is_adapter_running(args) {
        return this.eim_client.adapter_base_client.connected;
    }

    // when receive
    whenMessageReceive(args) {
        const content = args.content;
        return this.eim_client.isTargetMessage(content);
    }

    whenAnyMessageReceive(args) {
        return this.eim_client.isTargetMessage("_any");
    }


    getComingMessage() {
        let result = this.eim_client.adapter_node_content_reporter;
        // 避免未定义
        if (result){return result} else{return ""}
    }

    // when receive
    whenTopicMessageReceive(args) {
        const targetNodeId = args.node_id;
        const targetContent = args.content;
        return this.eim_client.isTargetTopicMessage(
            targetNodeId,
            targetContent
        );
    }

    whenAnyTopicMessageReceive(args) {
        const targetNodeId = args.node_id;
        return this.eim_client.isTargetTopicMessage(
            targetNodeId,
            "_any"
        );
    }

    // broadcast message
    // 使用广播的概念, 与scratch保持一致
    broadcastMessage(args) {
        const content = args.content;
        this.eim_client.emit_without_messageid(NODE_ID, content);
        return;
    }

    broadcastMessageAndWait(args) {
        const content = args.content;
        return this.eim_client.emit_with_messageid(NODE_ID, content);
    }

    broadcastMessageAndWait_REPORTER(args) {
        const content = args.content;
        return this.eim_client.emit_with_messageid(NODE_ID, content);
    }

    // broadcast message
    // 使用广播的概念, 与scratch保持一致
    broadcastTopicMessage(args) {
        const node_id = args.node_id;
        const content = args.content;
        this.eim_client.emit_without_messageid(node_id, content);
        return;
    }

    broadcastTopicMessageAndWait(args) {
        // topic服务于消息功能， node_id承载业务逻辑(extension)
        const node_id = args.node_id;
        const content = args.content;
        return this.eim_client.emit_with_messageid(node_id, content);
    }

    broadcastTopicMessageAndWait_REPORTER(args) {
        // topic服务于消息功能， node_id承载业务逻辑(extension)
        const node_id = args.node_id;
        const content = args.content;
        return this.eim_client.emit_with_messageid(node_id, content);
    }

    // wait/not wait

    control_extension(args) {
        const content = args.turn;
        const ext_name = args.ext_name;
        return this.eim_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            ext_name,
            "extension"
        );
    }

    // todo 主动查询后端 使用rpc风格，有id的消息 和没有id的消息
    is_extension_turned_on(args) {
        const ext_name = args.ext_name;
        const statu = this.eim_client.exts_statu[ext_name]["is_running"];
        if (statu) {
            return statu;
        } else {
            return false;
        }
    }

    control_node(args) {
        const content = args.turn;
        const node_name = args.node_name;
        return this.eim_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            node_name,
            "node"
        );
    }
    // todo 主动查询后端 使用rpc风格，有id的消息 和没有id的消息
    is_node_turned_on(args) {
        const node_name = args.node_name;
        const statu = this.eim_client.nodes_statu[node_name]["is_running"];
        if (statu) {
            return statu;
        } else {
            return false;
        }
    }
}

/*
注意安全问题: 赋予用户强大的能力，但提醒他们担心锤子砸伤脚
*/

module.exports = EIMBlocks;
