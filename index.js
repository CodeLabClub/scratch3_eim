const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
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

const Form_getComingTapicMessage = {
    en: "received [node_id] message",
    "zh-cn": "收到[node_id]的消息",
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

const FormSetEmitTimeout = {
    en: "set wait timeout [emit_timeout]s",
    "zh-cn": "设置等待超时时间[emit_timeout]秒",
};

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = require('./icon.svg')
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

    constructor(node_id, help_url, runtime) {
        this._runtime = runtime;
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;

        // eim
        this.exts_statu = {};
        this.nodes_statu = {};
        this.emit_timeout = 5000; //ms

        this.adapter_base_client = new AdapterBaseClient(
            null, // onConnect,
            null, // onDisconnect,
            null, // onMessage,
            this.onAdapterPluginMessage.bind(this), // onAdapterPluginMessage,
            this.update_nodes_status.bind(this), // update_nodes_status,
            this.node_statu_change_callback.bind(this), // node_statu_change_callback,
            null, // notify_callback,
            null, // error_message_callback,
            null, // update_adapter_status
            100 ,//SendRateMax // EIM没有可以发送100条消息
            runtime,
        );
    }

    emit_with_messageid(NODE_ID, content){
        return this.adapter_base_client.emit_with_messageid(NODE_ID, content, this.emit_timeout)
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
                text: "extension_python",
                value: "extension_python",
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
                text: "node_physical_blocks",
                value: "node_physical_blocks",
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
        this.eim_client = new EIMClient(NODE_ID, HELP_URL, runtime);
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
            name: "EIM 消息传递",
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
                    opcode: "set_emit_timeout",
                    blockType: BlockType.COMMAND,
                    text: FormSetEmitTimeout[the_locale],
                    arguments: {
                        emit_timeout: {
                            type: ArgumentType.NUMBER,
                            defaultValue:5.0,
                        },
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
                            defaultValue: "extension_python",
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
                            defaultValue: "extension_python",
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
                            defaultValue: "node_physical_blocks",
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
                            defaultValue: "node_physical_blocks",
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
                    opcode: "getComingTopicMessage",
                    blockType: BlockType.REPORTER, // BOOLEAN, COMMAND
                    text: Form_getComingTapicMessage[the_locale],
                    arguments: {
                        node_id: {
                            type: ArgumentType.STRING,
                            defaultValue: "eim/extension_python",
                        }
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
        let token = this.eim_client.adapter_base_client.token;
        window.open(`https://codelab-adapter.codelab.club:12358/?adapter_token=${token}`);
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
        if (result){
            return JSON.stringify(result)
        } else{return ""}
    }

    getComingTopicMessage(args) {
        const targetNodeId = args.node_id;
        let result = this.eim_client.adapter_node_content_reporter;
        // 避免未定义
        if (targetNodeId === this.eim_client.node_id){
            if (result){
                return JSON.stringify(result)
            }
        }
        return ""
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
        this.eim_client.adapter_base_client.emit_without_messageid(NODE_ID, content);
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
        this.eim_client.adapter_base_client.emit_without_messageid(node_id, content);
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
        return this.eim_client.adapter_base_client.emit_with_messageid_for_control(
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
        return this.eim_client.adapter_base_client.emit_with_messageid_for_control(
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

    set_emit_timeout(args) {
        const timeout = parseFloat(args.emit_timeout) * 1000;
        this.eim_client.emit_timeout = timeout;
    }

}

/*
注意安全问题: 赋予用户强大的能力，但提醒他们担心锤子砸伤脚
*/

module.exports = EIMBlocks;
