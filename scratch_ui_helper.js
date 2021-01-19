class ScratchUIHelper {
    constructor(
        extensionId,
        node_name,
        NODE_ID,
        runtime,
        adapter_base_client,
        timeout = 5000
    ) {
        this.extensionId = extensionId; // extensionId 几个类里都未定义 extension_id
        this._runtime = runtime;
        this.adapter_base_client = adapter_base_client;
        this.connected = false;
        this.node_name = node_name;
        this.NODE_ID = NODE_ID;
        this.timeout = timeout;
        this.connected = false; //描述设备连接？而不是管道连接
    }

    formatThings(things) {
        // text value list
        // console.log("things -> ", this.things);
        if (Array.isArray(things) && things.length) {
            // window.extensions_statu = this.exts_statu;
            return things.map((x) => ({ text: x, value: x }));
        } else {
            return [
                {
                    text: "",
                    value: "",
                },
            ];
        }
    }

    _start_node(node_name) {
        // todo: disconnect
        const content = "start";
        // const node_name = 'extension_microbit_radio';
        return this.adapter_base_client
            .emit_with_messageid_for_control(
                this.NODE_ID,
                content,
                node_name,
                "node"
            )
            .then(() => {
                console.log(`start ${node_name}`);
                //todo update_ports
            });
    }

    scan() {
        // 开启adapter插件，并扫描（list things）
        // console.debug("client.connected:", this.adapter_base_client.connected);
        // (window.socketState !== undefined && !window.socketState) ||
        if (!this.adapter_base_client.connected) {
            this._runtime.emit(
                this._runtime.constructor.PERIPHERAL_REQUEST_ERROR,
                {
                    message: `Codelab adapter 未连接`,
                    extensionId: this.extensionId,
                }
            );
            console.error(`Codelab adapter 未连接`);
            return;
        }
        let promise = Promise.resolve();

        //  打开插件(幂等操作)
        promise = promise.then(() => {
            return this._start_node(this.node_name);
        });

        // 获取things
        const code = `list(timeout=${this.timeout/1000-1})`; // 广播 , 收到特定信息更新变量
        promise.then(() => {
            // 默认5秒超时
            return this.adapter_base_client
                .emit_with_messageid(this.NODE_ID, code, this.timeout) // todo 多层then问题
                .then((data) => {
                    console.log("data:", data);
                    let json_data = JSON.parse(data); // 可能为空
                    if((Array.isArray(json_data) && json_data.length==0) || !json_data){
                        return
                    }
                    // console.log("data:", data); //为何不是返回值, string
                    let ui_list = this.formatThings(json_data); // json load, json dump
                    console.log("ui_list:", ui_list);
                    let _Obj = ui_list
                        .filter((address) => !!address.value) // 可以有名字
                        .map((address) => ({
                            name: `${address.value}`,
                            peripheralId: address.value,
                            rssi: -0,
                        }))
                        .reduce((prev, curr) => {
                            prev[curr.peripheralId] = curr;
                            return prev;
                        }, {});
                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                        _Obj
                    ).catch((e) => console.error(e));;
                })
                .catch((e) => console.error(e));
        });

        console.log("scan");
    }

    connect(id) {
        // UI 触发
        console.log(`ready to connect ${id}`);
        if (this.adapter_base_client) {
            const code = `connect("${id}")`; // disconnect()

            this.adapter_base_client
                .emit_with_messageid(this.NODE_ID, code)
                .then(() => {
                    this.connected = true;
                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_CONNECTED
                    );
                });
        }
    }

    disconnect() {
        this.reset();

        if (!this.adapter_base_client.connected) {
            return;
        }

        const code = `disconnect()`; // disconnect()， 是否关闭adapter插件 由插件自己决定
        this.adapter_base_client
            .emit_with_messageid(this.NODE_ID, code)
            .then((res) => {
                // 这个消息没有 resolve
                console.log(res);
            })
            .catch((e) => console.error(e));
    }

    reset() {
        console.log("reset");
        this.connected = false;
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
    }

    isConnected() {
        //  未被使用
        let connected = false;
        if (this.adapter_base_client) {
            connected =
                this.adapter_base_client.connected && this.connected;
        }
        return connected;
    }
}

module.exports = ScratchUIHelper;
