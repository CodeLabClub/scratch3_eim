const io = require("socket.io-client");

class AdapterBaseClient {
    // fork for eim client
    // onMessage,
    constructor(
        onConnect,
        onDisconnect,
        onMessage,
        onAdapterPluginMessage,
        update_nodes_status,
        node_statu_change_callback,
        notify_callback,
        error_message_callback,
        update_adapter_status
    ) {
        const ADAPTER_TOPIC = "adapter/nodes/data";
        const EXTS_OPERATE_TOPIC = "core/exts/operate";

        const NODES_STATUS_TOPIC = "core/nodes/status";
        const NODE_STATU_CHANGE_TOPIC = "core/node/statu/change";
        const NOTIFICATION_TOPIC = "core/notification";
        const ADAPTER_STATUS_TOPIC = "core/status";

        this.NODES_OPERATE_TOPIC = "core/nodes/operate";
        this.GUI_TOPIC = "gui/operate";
        this.NODES_STATUS_TRIGGER_TOPIC = "core/nodes/status/trigger";
        this.SCRATCH_TOPIC = "scratch/extensions/command";
        this.plugin_topic_map = {
            node: this.NODES_OPERATE_TOPIC,
            extension: EXTS_OPERATE_TOPIC,
        };

        // this._requestID = 0; // todo uuid
        this._promiseResolves = {};

        const url = new URL(window.location.href);
        let adapterHost = url.searchParams.get("adapter_host"); // 支持树莓派(分布式使用)
        if (!adapterHost) {
            adapterHost = window.__static
                ? "127.0.0.1"
                : "codelab-adapter.codelab.club";
        }
        this.adapterHost = adapterHost;
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        this.socket = io(
            `${window.__static ? "https:" : ""}//${adapterHost}:12358` +
                `/test?token=${token}`,
            {
                transports: ["websocket"],
            }
        );
        this.connected = false;

        this.socket.on("connect", () => {
            // 主动发起获取插件状态的请求，发出一则消息
            // console.log("socket connect ->", reason);
            this.nodes_status_trigger();
            // let onConnect = '';
            if (typeof onConnect === "function") {
                onConnect(); // 回调外部函数，onConnect可以是空的，忽视
            } else {
                console.log("onConnect is not function");
            }
            this.connected = true;
        });
        this.socket.on("disconnect", (reason) => {
            if (typeof onDisconnect === "function") {
                onDisconnect(reason);
            }
            this.connected = false;
        });

        // on message
        this.socket.on("sensor", (msg) => {
            // actuator: to scratch
            console.log("recv(all message):", msg.message);
            if (typeof onMessage === "function") {
                onMessage(msg);
            }
            const topic = msg.message.topic;
            const content = msg.message.payload.content;
            const message_id = msg.message.payload.message_id;
            // console.log('topic ->', topic);
            switch (topic) {
                case ADAPTER_STATUS_TOPIC: {
                    // if (msg.message.topic === this.ADAPTER_STATUS_TOPIC) {
                    console.log("adapter core info:", content);
                    // this.version = content.version;
                    if (typeof update_adapter_status === "function") {
                        update_adapter_status(content);
                    }
                    break;
                }
                case NODES_STATUS_TOPIC: {
                    // 所有 plugin 的状态信息 初始化触发一次
                    // parents: this.adapter_client. trigger for nodes status
                    // console.debug("NODES_STATUS_TOPIC message");
                    if (typeof update_nodes_status === "function") {
                        // console.debug("callback update_nodes_status")
                        update_nodes_status(content);
                    }
                    // console.debug("NODES_STATUS_TOPIC messsage end");
                    break;
                }
                // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/switch
                // 如果没有break，则自动运行 已匹配到case的下一个 case
                case NODE_STATU_CHANGE_TOPIC: {
                    // update extension status(start/stop  open/close)
                    const extension_node_name = msg.message.payload.node_name; //node or extension
                    // extension or node
                    console.log("extension_node_name:", extension_node_name);
                    if (typeof node_statu_change_callback === "function") {
                        node_statu_change_callback(
                            extension_node_name,
                            content
                        );
                    }
                    break;
                }

                case NOTIFICATION_TOPIC: {
                    // todo content.type
                    const type = msg.message.payload.type.toLowerCase();
                    const html = msg.message.payload.html;
                    console.log("notification:", msg.message.payload);
                    // alert(content);

                    if (html == true) {
                        let notify_message = {
                            dangerouslyUseHTMLString: true,
                            message: content,
                            duration: 0,
                        };
                        if (typeof notify_callback === "function") {
                            notify_callback(notify_message);
                        }
                        return; //不再往下走
                    }

                    if (type === "error") {
                        // show error
                        let error_message = {
                            // html ?
                            showClose: true,
                            duration: 5000,
                            message: content,
                            type: type, // warning
                        };
                        if (typeof error_message_callback === "function") {
                            error_message_callback(error_message);
                        }
                    } else {
                        let notify_message = {
                            message: content,
                            type: type, // warning
                        };
                        if (typeof notify_callback === "function") {
                            notify_callback(notify_message);
                        }
                    }
                    if (content == "download successfully!") {
                        this.nodes_status_trigger();
                    }
                    break;
                }
                case ADAPTER_TOPIC: {
                    // console.log("ADAPTER_TOPIC message");
                    if (typeof onAdapterPluginMessage === "function") {
                        onAdapterPluginMessage(msg);
                    }
                    // window.message = msg; // to global
                    console.log(
                        `ADAPTER_TOPIC message->`,
                        content
                    );
                    // 处理对应id的resolve
                    if (typeof message_id !== "undefined") {
                        this._promiseResolves[message_id] &&
                            this._promiseResolves[message_id](
                                content
                            );
                    }
                    break;
                }
            }
        });
    }

    exit_adapter_app() {
        let turn = "stop";
        const message = {
            topic: this.NODES_OPERATE_TOPIC,
            payload: {
                content: turn,
                node_id: "adapter/app",
                node_name: "_", // use id
            },
        };
        this.socket.emit("actuator", message);
    }

    nodes_status_trigger() {
        const message = {
            topic: this.NODES_STATUS_TRIGGER_TOPIC,
            payload: {
                content: "UPDATE_UI",
            },
        };
        this.socket.emit("actuator", message);
    }

    refresh_env() {
        // todo 作为core的子集 而不是新的topic
        const message = {
            topic: this.NODES_STATUS_TRIGGER_TOPIC,
            payload: {
                content: "REFRESH_ENV",
            },
        };
        console.log("ready to refresh_env(send message)");
        this.socket.emit("actuator", message);
    }

    download(plugin_url) {
        const message = {
            topic: this.GUI_TOPIC,
            payload: {
                content: "plugin_download",
                plugin_url: plugin_url,
                node_id: "adapter/app",
            },
        };
        this.socket.emit("actuator", message);
        // todo await
    }

    operate_node_extension(turn, node_name, pluginType) {
        const message = {
            topic: this.plugin_topic_map[pluginType],
            payload: {
                content: turn,
                node_id: "_", // 不要使用它，避免bug（难以排查！）
                node_name: node_name,
            },
        };
        this.socket.emit("actuator", message); // actuator: from scratch
        // todo: 确认完成之后才切换， 得到后端反馈(message id) json-rpc(scratch)
    }

    menu_action(val) {
        // let _this = this;
        if (val == "extensions_update") {
            const message = {
                topic: this.GUI_TOPIC,
                payload: {
                    content: val,
                    node_id: "adapter/app",
                },
            };
            this.socket.emit("actuator", message);

            setTimeout(() => {
                this.exit_adapter_app();
                alert("更新成功，请重启 (Update successful, please restart.)");
            }, 500);
        } else if (val == "refresh_env") {
            this.refresh_env();
        } else {
            const message = {
                topic: this.GUI_TOPIC,
                payload: {
                    content: val,
                    node_id: "adapter/app",
                },
            };
            this.socket.emit("actuator", message);
        }
    }

    get_reply_message(messageID) {
        const timeout = 5000; // ms todo 交给用户选择
        return new Promise((resolve, reject) => {
            this._promiseResolves[messageID] = resolve; // 抛到外部
            setTimeout(() => {
                resolve(`timeout(${timeout}ms)`);
            }, timeout);
        });
    }

    get_uuid(){
        // https://stackoverflow.com/questions/105034/how-to-create-guid-uuid
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });   
    }

    emit_with_messageid(node_id, content) {
        // if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const messageID = this.get_uuid();
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
        // if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const messageID = this.get_uuid();
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
        // if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
    }
}

// window.AdapterBaseClient = AdapterBaseClient;
module.exports = AdapterBaseClient;
