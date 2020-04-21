const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const RateLimiter = require("../../util/rateLimiter.js");
const formatMessage = require("format-message");
const io = require("socket.io-client"); // yarn add socket.io-client socket.io-client@2.2.0
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

class AdapterEIMClient {
    constructor(node_id, help_url) {
        const ADAPTER_TOPIC = "adapter/nodes/data";
        const EXTS_OPERATE_TOPIC = "core/exts/operate";
        const NODES_OPERATE_TOPIC = "core/nodes/operate";
        const NODES_STATUS_TOPIC = "core/nodes/status";
        const NODE_STATU_CHANGE_TOPIC = "core/node/statu/change";
        const NOTIFICATION_TOPIC = "core/notification";

        this.NODES_STATUS_TRIGGER_TOPIC = "core/nodes/status/trigger";
        this.SCRATCH_TOPIC = "scratch/extensions/command";
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;
        this.plugin_topic_map = {
            node: NODES_OPERATE_TOPIC,
            extension: EXTS_OPERATE_TOPIC,
        };

        this._requestID = 0;
        this._promiseResolves = {};
        const SendRateMax = 10;
        this._rateLimiter = new RateLimiter(SendRateMax);

        // eim
        this.exts_statu = {};
        this.nodes_statu = {};

        const url = new URL(window.location.href);
        var adapterHost = url.searchParams.get("adapter_host"); // 支持树莓派(分布式使用)
        if (!adapterHost) {
            var adapterHost = window.__static
                ? "127.0.0.1"
                : "codelab-adapter.codelab.club";
        }
        // console.log(`${this.NODE_ID} ready to connect adapter...`)
        this.socket = io(
            `${window.__static ? "https:" : ""}//${adapterHost}:12358` +
                "/test",
            {
                transports: ["websocket"],
            }
        );

        // connect
        this.socket.on("connect", () => {
            // 触发一次插件状态的请求,
            this.update_extension_ui(); // parents message
            this.status = "connected!";
            this.connected = true;
        });

        // message
        this.socket.on("sensor", (msg) => {
            // all message
            console.log(
                `${this.NODE_ID} sensor message(all message)->`,
                msg.message.payload.content
            );
            // console.log(`sensor channel get message:`, msg);
            this.topic = msg.message.topic;
            this.node_id = msg.message.payload.node_id;
            const message_id = msg.message.payload.message_id;
            // if else if
            switch (this.topic) {
                case NODE_STATU_CHANGE_TOPIC: {
                    const extension_node_name = msg.message.payload.node_name;
                    const content = msg.message.payload.content;
                    console.log(`${this.NODE_ID} statu change to ${content}`);
                    const status_checked_map = { start: true, stop: false };
                    if (extension_node_name.startsWith("extension_")) {
                        this.exts_statu[extension_node_name]["is_running"] =
                            status_checked_map[content];
                        console.log(
                            `${this.NODE_ID} extension statu change to ${content}`
                        );
                    }
                    if (extension_node_name.startsWith("node_")) {
                        this.nodes_statu[extension_node_name]["is_running"] =
                            status_checked_map[content];
                        console.log(
                            `${this.NODE_ID} node statu change to ${content}`
                        );
                    }
                    break;
                }
                case NODES_STATUS_TOPIC: {
                    // parents: connect to pub trigger
                    const content = msg.message.payload.content;
                    console.log(
                        `${this.NODE_ID} extensions status:`,
                        msg.message.payload.content
                    );
                    this.exts_statu = content["exts_status_and_info"];
                    this.nodes_statu = content["node_status_and_info"];
                    break;
                }
                case NOTIFICATION_TOPIC: {
                    console.log(
                        `${this.NODE_ID} NOTIFICATION:`,
                        msg.message.payload.content
                    );
                    break;
                }
                case ADAPTER_TOPIC: {
                    // 特殊处理
                    window.message = msg;
                    this.adapter_node_content_hat = msg.message.payload.content;

                    // reporter 不清楚，最近一次
                    this.adapter_node_content_reporter =
                        msg.message.payload.content;
                    console.log(
                        `${this.NODE_ID} ADAPTER_TOPIC message->`,
                        msg.message.payload.content
                    );
                    // 处理对应id的resolve
                    if (typeof message_id !== "undefined") {
                        this._promiseResolves[message_id] &&
                            this._promiseResolves[message_id](
                                msg.message.payload.content
                            );
                    }
                    break;
                }
            }
        });
    }

    update_extension_ui() {
        const message = {
            topic: this.NODES_STATUS_TRIGGER_TOPIC,
            payload: {
                content: "UPDATE_UI",
            },
        };
        this.socket.emit("actuator", message);
    }

    get_reply_message(messageID) {
        const timeout = 5000; // ms todo 交给用户选择
        return new Promise((resolve, reject) => {
            this._promiseResolves[messageID] = resolve; // 抛到外部
            setTimeout(() => {
                reject(`timeout(${timeout}ms)`);
            }, timeout);
        });
    }

    emit_with_messageid(node_id, content) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const messageID = this._requestID++;
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        payload.message_id = messageID;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
        return this.get_reply_message(messageID);
    }

    emit_with_messageid_for_control(node_id, content, node_name, pluginType) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const messageID = this._requestID++;
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        payload.message_id = messageID;
        payload.node_name = node_name;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.plugin_topic_map[pluginType],
        });
        return this.get_reply_message(messageID);
    }

    emit_without_messageid(node_id, content) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
    }

    isTargetMessage(content) {
        // 是逻辑判断
        if (
            this.adapter_node_content_hat &&
            content === this.adapter_node_content_hat
        ) {
            // 1/100秒后清除
            setTimeout(() => {
                this.adapter_node_content_hat = null; // 每次清空
            }, 10); //ms
            return true;
        }
    }

    isTargetTopicMessage(targerNodeId, targetContent) {
        if (
            targetContent === this.adapter_node_content_hat &&
            targerNodeId === this.node_id
        ) {
            setTimeout(() => {
                this.adapter_node_content_hat = null; // 每次清空
                this.node_id = null;
            }, 10); //ms
            return true;
        }
    }

    formatExtension() {
        // text value list
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
        this.adapter_client = new AdapterEIMClient(NODE_ID, HELP_URL);
    }

    /**
     * The key to load & store a target's test-related state.
     * @type {string}
     */
    static get STATE_KEY() {
        return "Scratch.eim";
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: NODE_ID,
            name: "EIM",
            menuIconURI: menuIconURI,
            blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: "open_help_url",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "eim.open_help_url",
                        default: "help",
                        description: "open help url",
                    }),
                    arguments: {},
                },
                {
                    opcode: "whenMessageReceive",
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: "eim.whenMessageReceive",
                        default: "when I receive [content]",
                        description: "receive target message",
                    }),
                    arguments: {
                        content: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello",
                        },
                    },
                },
                {
                    opcode: "getComingMessage",
                    blockType: BlockType.REPORTER, // BOOLEAN, COMMAND
                    text: formatMessage({
                        id: "eim.getComingMessage",
                        default: "received message",
                        description: "received message",
                    }),
                    arguments: {},
                },
                // 优先推荐wait模式（同步）
                {
                    opcode: "broadcastMessageAndWait",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "eim.sendMessageAndWait",
                        default: "broadcast [content] and wait",
                        description:
                            "broadcast message to codelab-adapter and wait",
                    }),
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
                    text: formatMessage({
                        id: "eim.sendMessage",
                        default: "broadcast [content]",
                        description: "broadcast message to codelab-adapter",
                    }),
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
                    text: formatMessage({
                        id: "eim.control_extension",
                        default: "[turn] [ext_name]",
                        description:
                            "turn on/off the extension of codelab-adapter",
                    }),
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
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "eim.is_extension_turned_on",
                        default: "is [ext_name] turned on?",
                        description: "get the extension statu",
                    }),
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
                    text: formatMessage({
                        id: "eim.control_node",
                        default: "[turn] [node_name]",
                        description: "turn on/off the node of codelab-adapter",
                    }),
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
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "eim.is_node_turned_on",
                        default: "is [node_name] turned on?",
                        description: "get the node statu",
                    }),
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
                    text: formatMessage({
                        id: "eim.whenTopicMessageReceive",
                        default: "when I receive [node_id] [content]",
                        description: "receive target topic message",
                    }),
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
                    opcode: "broadcastTopicMessageAndWait",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "eim.sendTopicMessageAndWait",
                        default: "broadcast [node_id] [content] and wait",
                        description:
                            "broadcast topic message to codelab-adapter and wait",
                    }),
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
                    text: formatMessage({
                        id: "eim.sendTopicMessage",
                        default: "broadcast [node_id] [content]",
                        description:
                            "broadcast topic message to codelab-adapter",
                    }),
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
                    text: formatMessage({
                        id: "eim.sendTopicMessageAndWait_REPORTER",
                        default: "broadcast [node_id] [content] and wait",
                        description:
                            "broadcast topic message to codelab-adapter and wait(REPORTER)",
                    }),
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
                    text: formatMessage({
                        id: "eim.trust_adapter_host",
                        default: "trust adapter host[adapter_host]",
                        description: "trust adapter host",
                    }),
                    arguments: {
                        adapter_host: {
                            type: ArgumentType.STRING,
                            defaultValue: `${this.adapterHost}`, //'https://raspberrypi.local:12358'
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
        return this.adapter_client.formatExtension();
    }
    _formatNode() {
        return this.adapter_client.formatNode();
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
        window.open(this.adapter_client.HELP_URL);
    }

    // when receive
    whenMessageReceive(args) {
        const content = args.content;
        return this.adapter_client.isTargetMessage(content);
    }

    getComingMessage() {
        return this.adapter_client.adapter_node_content_reporter_reporter;
    }

    // when receive
    whenTopicMessageReceive(args) {
        const targetNodeId = args.node_id;
        const targetContent = args.content;
        return this.adapter_client.isTargetTopicMessage(
            targetNodeId,
            targetContent
        );
    }

    // broadcast message
    // 使用广播的概念, 与scratch保持一致
    broadcastMessage(args) {
        const content = args.content;
        this.adapter_client.emit_without_messageid(NODE_ID, content);
        return;
    }

    broadcastMessageAndWait(args) {
        const content = args.content;
        return this.adapter_client.emit_with_messageid(NODE_ID, content);
    }

    // broadcast message
    // 使用广播的概念, 与scratch保持一致
    broadcastTopicMessage(args) {
        const node_id = args.node_id;
        const content = args.content;
        this.adapter_client.emit_without_messageid(node_id, content);
        return;
    }

    broadcastTopicMessageAndWait(args) {
        // topic服务于消息功能， node_id承载业务逻辑(extension)
        const node_id = args.node_id;
        const content = args.content;
        return this.adapter_client.emit_with_messageid(node_id, content);
    }

    broadcastTopicMessageAndWait_REPORTER(args) {
        // topic服务于消息功能， node_id承载业务逻辑(extension)
        const node_id = args.node_id;
        const content = args.content;
        return this.adapter_client.emit_with_messageid(node_id, content);
    }

    // wait/not wait

    control_extension(args) {
        const content = args.turn;
        const ext_name = args.ext_name;
        return this.adapter_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            ext_name,
            "extension"
        );
    }

    // todo 主动查询后端 使用rpc风格，有id的消息 和没有id的消息
    is_extension_turned_on(args) {
        const ext_name = args.ext_name;
        const statu = this.adapter_client.exts_statu[ext_name]["is_running"];
        if (statu) {
            return statu;
        } else {
            return false;
        }
    }

    control_node(args) {
        const content = args.turn;
        const node_name = args.node_name;
        return this.adapter_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            node_name,
            "node"
        );
    }
    // todo 主动查询后端 使用rpc风格，有id的消息 和没有id的消息
    is_node_turned_on(args) {
        const node_name = args.node_name;
        const statu = this.adapter_client.nodes_statu[node_name]["is_running"];
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
