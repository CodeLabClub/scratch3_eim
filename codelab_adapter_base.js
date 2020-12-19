const io = require("socket.io-client"); // yarn add socket.io-client@2.3.1
const RateLimiter = require("./rateLimiter.js"); // 独立放一份到这里

class AdapterBaseClient {
    // fork for eim client
    // onMessage,
    // todo
    constructor(
        onConnect,
        onDisconnect,
        onMessage,
        onAdapterPluginMessage,
        update_nodes_status,
        node_statu_change_callback,
        notify_callback,
        error_message_callback,
        update_adapter_status,
        SendRateMax = 60, // 每个插件每秒最多60条消息, eim/websocket 承载能力都远超这个值
        runtime = null,
    ) {
        this.debug_mode = false; //false
        this.NOTIFICATION_lasttime = new Date().getTime();
        this.runtime = runtime;
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

        // Linda
        this.LINDA_SERVER = "linda/server"; //target
        this.LINDA_CLIENT = "linda/client";

        this.plugin_topic_map = {
            node: this.NODES_OPERATE_TOPIC,
            extension: EXTS_OPERATE_TOPIC,
        };

        // this._requestID = 0; // todo uuid
        this._promiseResolves = {};
        this.SendRateMax = SendRateMax;
        this._rateLimiter = new RateLimiter(SendRateMax);

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
                        if (this._promiseResolves[message_id]){
                            this._promiseResolves[message_id](content);
                            delete this._promiseResolves[message_id];
                            // console.log({message_id:this._promiseResolves[message_id]});
                        }
                    }
                    break;
                }

                case this.LINDA_CLIENT: {
                    const tuple = msg.message.payload.tuple;
                    console.log(
                        `LINDA_CLIENT message->`,
                        tuple
                    );
                    // 复用EIM位置参数
                    if (typeof onAdapterPluginMessage === "function") {
                        onAdapterPluginMessage(msg);
                    }
                    // todo 和 EIM 走同个逻辑管道
                    if (typeof message_id !== "undefined") {
                        if (this._promiseResolves[message_id]){
                            this._promiseResolves[message_id](tuple);
                            delete this._promiseResolves[message_id];
                            // console.log({message_id:this._promiseResolves[message_id]});
                        }
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

    get_reply_message(messageID, timeout=5000) {
        return new Promise((resolve, reject) => {
            this._promiseResolves[messageID] = resolve; // 抛到外部
            setTimeout(() => {
                if (this._promiseResolves[messageID]){
                    console.error(`timeout(${timeout/1000}s)`)
                    resolve(`timeout(${timeout/1000}s)`); // reject 积木会中止吗？
                    // todo 通知, 积木名字
                    // todo: https://github.com/LLK/scratch-vm/blob/acc2e6dba2e5a32668f0b26f0b2c4dfdecbe1023/src/util/jsonrpc.js#L91
                    this.runtime.emit('PUSH_NOTIFICATION', {content: `timeout(${timeout/1000}s)`, type: 'error'})
                }
                
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

    check_limiter(){
        if (this._rateLimiter.okayToSend()){ 
            return true;
        }
        else{
            let now = new Date().getTime(); // ms
            // runtime.emit('PUSH_NOTIFICATION', {content: '通知内容', type: 'success | error | warning | info'})
            console.error(`rate limit (${this.SendRateMax})`);
            // 一秒内只发一次
            if (this.runtime){
                if (now - this.NOTIFICATION_lasttime > 1000 ){
                // 如果不存在会如何？
                // util.stopAll();
                try{
                    console.debug(`PUSH_NOTIFICATION`);
                    this.runtime.emit('PUSH_NOTIFICATION', {content: `rate limit (${this.SendRateMax})`, type: 'error'})
                    // todo 灾难不要发生在全局，只是弹出提醒
                    // this.runtime.stopAll(); 弹出消息更细致 包括积木名字
                }
                catch (e) {
                    console.error(e)
                 }
                
                this.NOTIFICATION_lasttime = new Date().getTime();
                }
            }
            
            /*
            window.antNotification.error({
                message: 'Error',
                description: `rate limit (${this.SendRateMax})`
            });*/
            return false;
        }
    }

    emit_with_messageid(node_id, content, timeout=5000) {
        // todo 添加积木信息，抛出错误
        if (!this.check_limiter()) return Promise.resolve('rate limit');
        // socket connected?
        if (!this.connected) return Promise.resolve('not connected');
        const messageID = this.get_uuid();
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        payload.message_id = messageID;
        if (this.debug_mode){
            payload.timestamp = new Date().getTime();
        }
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
        return this.get_reply_message(messageID, timeout);
    }

    send_to_linda(node_id, payload, timeout=5000) {
        // send to linda server and wait
        // 最好是只查询的，不要是有副作用的，永远，不要超时，或者超时，就发送一个目标tuple，抵消原来的请求
        // todo 添加积木信息，抛出错误
        // todo: 目前也走 EIM
        if (!this.check_limiter()) return Promise.resolve('rate limit');
        // socket connected?
        if (!this.connected) return Promise.resolve('not connected');
        
        // const payload = {};
        payload.node_id = node_id;
        // payload.tuple = linda_tuple; //tuple/list
        const messageID = this.get_uuid();
        payload.message_id = messageID;
        if (this.debug_mode){
            payload.timestamp = new Date().getTime();
        }
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.LINDA_SERVER,
        });
        return messageID;
        // return this.get_reply_message(messageID, timeout); //todo timeout
    }

    send_to_linda_and_wait(node_id, payload, timeout=5000) {
        //返回promise
        // 返回 promise reject？
        if (!(Array.isArray(payload["tuple"]) && payload["tuple"].length >0)){return Promise.reject('input error')}
        let messageID = this.send_to_linda(node_id, payload, timeout);
        return this.get_reply_message(messageID, timeout); //todo timeout
    }

    _linda_operate(operate, tuple){
        let node_id = "linda/js/client";
        let payload = {};
        payload["operate"] = operate;
        payload["tuple"] = tuple;
        return this.send_to_linda_and_wait(node_id, payload)
    }

    linda_out(tuple){
        return this._linda_operate("out", tuple);
    }

    linda_in(tuple){
        return this._linda_operate("in", tuple);
    }

    linda_dump(tuple){
        return this._linda_operate("dump", tuple);
    }

    emit_with_messageid_for_control(node_id, content, node_name, pluginType) {
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
        if (!this.check_limiter()) return Promise.resolve();
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        if (this.debug_mode){
            payload.timestamp = new Date().getTime();
        }
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
    }
}

// window.AdapterBaseClient = AdapterBaseClient;
module.exports = AdapterBaseClient;
