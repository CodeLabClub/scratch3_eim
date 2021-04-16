class ScratchUIHelper {
    constructor(
        extensionId,
        NODE_NAME,
        NODE_ID,
        NODE_MIN_VERSION,
        runtime,
        adapter_base_client,
        timeout = 5000
    ) {
        this.extensionId = extensionId; // extensionId 几个类里都未定义 extension_id
        this._runtime = runtime;
        // window.runtime = runtime;
        this.adapter_base_client = adapter_base_client;
        this.connected = false;
        this.NODE_NAME = NODE_NAME;
        this.NODE_ID = NODE_ID;
        this.NODE_MIN_VERSION = NODE_MIN_VERSION;
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

    _start_plugin(plugin_name) {
        // todo: disconnect
        console.log("start plugin");
        const content = "start";
        let plugin_type;
        if (plugin_name.startsWith('node_')){
            plugin_type = "node";
        }else{
            plugin_type = "extension";
        }
        return this.adapter_base_client
            .emit_with_messageid_for_control(
                this.NODE_ID,
                content,
                plugin_name,
                plugin_type
            )
            .then(() => {
                console.log(`start ${plugin_name}`);
                //todo update_ports
            });
    }

    _get_plugin_version(){
        // 每次查询
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("adapter_token");
        /*
        let adapter_host = urlParams.get("adapter_host");
        if(!adapter_host){
            adapter_host = "codelab-adapter.codelab.club";
        }
        // https://codelab-adapter.codelab.club:12358/api/get_node_versions?adapter_token=e2b1832a05f14f64
        return fetch(`https://${adapter_host}:12358/api/get_node_version?adapter_token=${token}&plugin_name=${this.NODE_NAME}`)
            .then(response => response.json())
            .then(data => {return data});
        */
        // todo  adapter_base_client get version
        return this.adapter_base_client.emit_with_messageid('eim/node_core_helper', {"adapter_token": token,"plugin_name": this.NODE_NAME, "message_type": 'get_plugin_version'}, 3000); //
        // return Promise.resolve({'VERSION': '9.0.0'}) // {'VERSION': '0.0.0'} // Promise.resolve({'VERSION': '0.0.0'})
    }

    scan() {
        // 开启adapter插件，并扫描（list things）
        // console.debug("client.connected:", this.adapter_base_client.connected);
        // todo window.socketState 暴露出来
        if(window.socketState !== undefined && !window.socketState){
        // if (!this.adapter_base_client || !this.adapter_base_client.connected) {
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
        // let promise = Promise.resolve(); // 不要并行！
        // https://javascript.info/promise-chaining
        let promise = this._get_plugin_version() // todo 使用websocket
        .then((plugin_info) => {
            let plugin_info_json = JSON.parse(plugin_info)
            console.debug("NODE_NAME:",this.NODE_NAME, "NODE_MIN_VERSION:",this.NODE_MIN_VERSION, "VERSION:",plugin_info_json.VERSION ); 
            console.debug('plugin_info:', plugin_info_json);
            if (plugin_info_json.VERSION && plugin_info_json.VERSION >= this.NODE_MIN_VERSION){
                // console.debug('plugin version ok')
                return true; //go on
            }
            else {
                let error_message = '插件不存在或版本太低';
                console.error(error_message);
                this._runtime.emit('PUSH_NOTIFICATION', {content: error_message, type: 'error'});
                this._runtime.emit(
                    this._runtime.constructor.PERIPHERAL_REQUEST_ERROR,
                    {
                        message: error_message,
                        extensionId: this.extensionId,
                    }
                );
                
                // throw(new Error(error_message));
                return Promise.reject(error_message)
            }
            
        }).then(() => this._start_plugin(this.NODE_NAME));
        // 获取adapter things
        const code = `list(timeout=${this.timeout/1000-1})`; // 广播 , 收到特定信息更新变量
        promise.then(() => {
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
                    if (_Obj){
                        // 有数据才更新
                        this._runtime.emit(
                            this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                            _Obj
                        ).catch((e) => console.error(e));;
                    }
                    
                })
                .catch((e) => console.error(e));
        });

        console.log("scan");
    }

    connect(id, timeout=5000) {
        // UI 触发
        // todo connect失败
        console.log(`ready to connect ${id}`);
        if (this.adapter_base_client) {
            // 连接超时则没成功
            const code = `connect("${id}", timeout=${timeout/1000+0.5})`; // disconnect()

            this.adapter_base_client
                .emit_with_messageid(this.NODE_ID, code, timeout)
                .then((data) => { // 检查返回值确认连接了 ok, 否则给出连接异常
                    console.debug("connect reply:", data)
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
