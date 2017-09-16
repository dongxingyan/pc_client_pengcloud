'use strict';
/* global angular, require, $ */

if (window.location.search) {
    if (!window.location.origin) {
        window.location.origin =
            window.location.protocol + '//' +
            window.location.hostname +
            (window.location.port ? ':' + window.location.port : '');
    }
    window.location.href =
        window.location.origin +
        window.location.pathname +
        '#/' + window.location.search;
}

angular.module('pexapp')

.filter('removeValues', function() {
    return function(obj, values) {
        var result = [];
        angular.forEach(obj, function(value, key) {
            if (values.indexOf(value) === -1) {
                result.push(value);
            }
        });
        return result;
    };
})

.controller('MainController', function(
    $rootScope,
    $scope,
    $log,
    $sce,
    $q,
    $localStorage,
    $window,
    $timeout,
    $location,
    $translate,
    $http,
    platformSettings,
    applicationSettings,
    defaultUserSettings,
    serverSettings,
    toast,
    modal,
    callHistory,
    Call,
    srvService,
    toggleService,
    dialHistory,
    flashVideo,
    mediaDevicesService,
    reportingService,
    websocketService) {

    $scope.dialHistory = dialHistory;
    $scope.flashVideo = flashVideo;
    $scope.toggle = toggleService.toggle;
    $scope.toastMessages = toast.messages;
    $scope.getModalMessage = modal.getMessage;
    $scope.errorMessage = null;
    $scope.plugins = applicationSettings.plugins;

    /***************************************************************************************************************/
    $rootScope.drpengExtend = window['drpeng'] = {
        isChair: null,
        mainScope: $scope,
        conferenceScope: null,
        search: '',
        localLanguage: null,
        appbarDisplay: false,
        handupList: [],
        uuid: '',
        alais: '',
        displayName: '',
        isDrpengMuted: '',
        orgManagementURL: applicationSettings.orgManagementURL,
        token: $location.search.token,
        speakerList: [],
        originSpeakerList: [],
        //新增加，用于控制登录框的显示
        isOnClick:false,
        ifShare:false,
        length:"",
        hide: true,

        permissionRecord: false,
        permissionLive: true,
        // 会控功能 layout settings
        settings: {
            showMode: 'polling',
            // showMode: 'fixed',
            aliasShow: 'off',
            layoutView: '1:0',
            participantUuid: [],
            requestSending: false,
        },
        isShowParticipantsSelect: true,
        speakerUUIDMap: {},
        noAuthoTip: '',
        rtmpParticipant: null,
        isRecording: null,
        isLiving: false,
        orgID: null,
        recordFileName: null,
        recordStartTime: null,
        recordTimeStr: '00:00:00',
        recordTimer: null,
        recordRtmpParticipant: null,
        recordRtmpUUID: null,
        isOwnRecord: false,
        liveRtmpParticipant: null,

        liveFileName: null,
        liveStartTime: null,
        liveTimeStr: '00:00:00',
        isOwnLive: false,
        waitingForServer: false,
        liveRtmpUUID: null,
        password: null,

        liveTimer: null,
        availableLiveList: null,
        selectLiveID: null,
        // 检测当前版本号
        checkBrowserVersion: function () {
            const AutoUpdater = require( "nw-autoupdater" ),
                updater = new AutoUpdater( require( "../package.json" ) );

            async function main(){
                try {
                    // Update copy is running to replace app with the update
                    if ( updater.isSwapRequest() ) {
                        var page = document.getElementById("homePage");
                        var pageLoading=document.getElementById("loadingBox");

                        page.style.display = "none";
                        pageLoading.style.display="block";

                        await updater.swap();

                        await updater.restart();
                        return;
                    }

                    // Download/unpack update if any available
                    const rManifest = await updater.readRemoteManifest();
                    const needsUpdate = await updater.checkNewVersion( rManifest );
                    if ( !needsUpdate ) {
                        return;
                    }
                    if (!confirm( $translate.instant('IDS_UPDATE_ALERT'))){
                        return;
                    }
                    // Subscribe for progress events
                    updater.on( "download", ( downloadSize, totalSize ) => {
                        console.log( "download progress", Math.floor( downloadSize / totalSize * 100 ), "%" );
                });
                    updater.on( "install", ( installFiles, totalFiles ) => {
                        console.log( "install progress", Math.floor( installFiles / totalFiles * 100 ), "%" );
                });
                    const updateFile = await updater.download( rManifest );
                    await updater.unpack( updateFile );
                    alert( $translate.instant('IDS_UPDATE_RESTART'));

                    updater.restartToSwapSXT(rManifest);

                } catch ( e ) {
                    console.error( e );
                }
            }

            setTimeout(function () {
                main();
            }, updater.isSwapRequest()?0:1000);
        },
        // 获取参会者列表
        getParticipantsList: function() {
            let participantsList = $rootScope.drpengExtend.mainScope.connection.participants;
            var str1 =JSON.stringify(participantsList).replace(/"displayName":"RTMP流"/g, '')
            $rootScope.drpengExtend.length=str1.split("displayName").length-1;
            let handUpList = $rootScope.drpengExtend.handupList;
            for (let field in participantsList) {
                let target = participantsList[field];
                let handUp = handUpList.filter((uuid) => {
                    return target.uuid === uuid;
                }).length;
                target.handUp = handUp;
            }
            return participantsList;
        },
        //获取参会人数
        // 判断我是否举手
        isMeHandUp: function () {
            // let participants = this.mainScope.connection.participants;
            let count = $rootScope.drpengExtend.handupList.filter((x)=> {
                return x === this.uuid;
            }).length;
            return count > 0;
        },
        // 发出举手或放手的请求
        setHandUp: function (option) {
            if(option) {
                websocketService.sendMsgForHandUp();
            } else {
                websocketService.sendMsgForHandDown();
            }
        },
        // 判断是否显示聊天记录下载按钮
        canSaveMessages: function () {
            var ua = navigator.userAgent;
            if (ua.indexOf('Macintosh') >= 0 && ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0) {
                return true;
            } else {
                return false;
            }
        },
        // 下载聊天记录
        saveMessages: function () {
            var resultStr = this.conferenceScope.chat.messages.reduce(function (pv, nv) {
                    return pv + nv.origin + ':' + nv.payload + '\r\n';
                }, '') || [];
            var blob = new Blob([resultStr]);
            // var download = window.open(URL.createObjectURL(blob));
            var link = $('#hidden-save-link');
            link.attr('download', this.getSaveName());
            link.attr('href', URL.createObjectURL(blob));
            link[0].click();
        },
        // 获取下载聊天记录对应的文件名
        getSaveName: function () {
            var isCn = localStorage['ngStorage-language'].indexOf('cn') >= 0;
            var now = new Date();

            function numFix(num) {
                return ('00' + num).slice(-2);
            }

            var dateStr = now.getFullYear() + numFix(now.getMonth() + 1) + numFix(now.getDate()) + numFix(now.getHours()) + numFix(now.getMinutes());
            if (isCn) {
                return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + '聊天记录.txt';
            } else {
                return localStorage.getItem('ngStorage-conference').replace(/\"/g, '') + dateStr + 'chatlogs.txt';
            }
        },
        // 判断是否被管理员静音
        getIsMuted: function() {
            let participantList = this.mainScope.connection.participants;
            for (let field in participantList) {
                let target = participantList[field];
                if (target.uuid === this.uuid) {
                    return target.isMuted;
                }
            }
        },
        // 全部挂断
        disconnectAll: function () {
            modal.confirm(
                'IDS_CONFERENCE_DISCONNECT_ALL',
                'IDS_CONFERENCE_DISCONNECT_ALL_MESSAGE',
                function () {
                    $rootScope.drpengExtend.mainScope.toggle('loading', true);
                    $rootScope.drpengExtend.mainScope.connection.disconnectAll();
                    if ($rootScope.drpengExtend.recordRtmpParticipant) {
                        drpengExtend.stopRecord();
                    }
                    if ($rootScope.drpengExtend.liveRtmpParticipant) {
                        $rootScope.drpengExtend.stopLive();
                    }
                },
                null,
                'IDS_BUTTON_DISCONNECT');
        },

        // 主屏显示弹框 加入发言者（页面效果，不走接口）
        speakerAdd: function (event) {
            let selectedOption = $('.participant-list-select').find('option:selected');
            let speaker = selectedOption.text();
            $rootScope.drpengExtend.speakerList.push(speaker);
            $rootScope.drpengExtend.speakerUUIDMap[speaker] = selectedOption.attr('data-uuid')
        },
        // 主屏显示弹框 移除发言者（页面效果，不走接口）
        removeSpeaker: function(speaker) {
            let thisSpeakerList = $rootScope.drpengExtend.speakerList;
            for(let i = 0; i < thisSpeakerList.length; i++) {
                if (thisSpeakerList[i] === speaker) {
                    thisSpeakerList.splice(i, 1);
                    $rootScope.drpengExtend.speakerList = thisSpeakerList;
                    delete $rootScope.drpengExtend.speakerUUIDMap[speaker];
                    return;
                }
            }
        },
        // 修改会议系统的布局（override_layout）
        updateLayoutSettings: function (event, updateKey, updateValue) {
            $rootScope.drpengExtend.settings[updateKey] = updateValue;
            let actorsArr = [];
            let vadBackfill;
            $rootScope.drpengExtend.settings.requestSending = true;

            let layouts = {
                "audience": [],
                "actors": $rootScope.drpengExtend.settings.participantUuid,
                "vad_backfill": true,
                "layout": $rootScope.drpengExtend.settings.layoutView,  // 分屏模式
                "indicators": "auto",
                "plus_n": "auto",
                "actors_overlay_text": $rootScope.drpengExtend.settings.aliasShow  // 是否显示昵称
            };
            let data = {
                layouts: layouts
            }
            $rootScope.drpengExtend.mainScope.connection.updateLayoutSettings(data);
            $rootScope.drpengExtend.settings.requestSending = false;
            $('#dialog-split-screen-mode').hide();

            let eventTarget = $(event.currentTarget);
            let eventTargetChildFirst = eventTarget.find('span:first');
            let eventTargetChildLast = eventTarget.find('span:last').html();

            if (updateKey.trim() === 'layoutView') {
                $rootScope.drpengExtend.hide = true;
                let splitScreenImgClass = 'nav_' + eventTargetChildFirst.attr('class');
                let splitScreenHtml = '<span class="'+ splitScreenImgClass +'"></span><span translate>' + eventTargetChildLast + '</span>';
                $('#split-screen-mode').html(splitScreenHtml);
            }
        },
        // 保存发言模式的设置
        saveSpeakerModeSet: function() {
            let speakerUUIDMap = $rootScope.drpengExtend.speakerUUIDMap;
            $rootScope.drpengExtend.settings.participantUuid = [];

            for (let item in speakerUUIDMap) {
                $rootScope.drpengExtend.settings.participantUuid.push(speakerUUIDMap[item]);
            }
            $rootScope.drpengExtend.updateLayoutSettings(event, '', '');
            $rootScope.drpengExtend.originSpeakerList = $rootScope.drpengExtend.speakerList.concat();
            // drpengExtend.speakerUUIDMap = {};
        },
        /**
         * 直播和录制
         * @param token
         */
        setRtmpParticipant (value) {
            $rootScope.drpengExtend.rtmpParticipant = value;
        },
        getRtmpParticipant: function () {
            return $rootScope.drpengExtend.rtmpParticipant;
        },
        setWaitingForServer: function (value) {
            $rootScope.drpengExtend.waitingForServer = value;
        },
        getWaitingForServer: function () {
            return $rootScope.drpengExtend.waitingForServer;
        },
        setPassword: function (password) {
            $rootScope.drpengExtend.password = password;
        },
        getPassword: function () {
            let password = '';
            let getPass = $rootScope.drpengExtend.password;
            if (getPass) {
                password = getPass;
            }
            return password;
        },

        /***************************************录制功能********************************************************/
        // 点击开始录制按钮
        startRecord (event) {
            let that = this;
            let countRTMP = $rootScope.drpengExtend.getRtmpParticipant();
            let participants = $rootScope.drpengExtend.mainScope.connection.participants;
            let personNum = $rootScope.drpengExtend.getPropertyCount(participants);
            if(personNum <= 1 && participants.displayName == '会控'){
                alert("会议还未开始，请开始后再操作");
            } else{
                // 判断是否有直播录制权限
                let url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + $rootScope.drpengExtend.alais + '/streams';
                $http({
                    method: 'get',
                    url: url,
                    headers: { "Content-Type": "application/json" }
                })
                    .then(function (response) {
                        if (response.data.code == 0) {
                            $rootScope.drpengExtend.orgID = response.data.orgId;
                            // 有录制权限
                            if (response.data.record == 1) {
                                // 录制推流
                                $rootScope.drpengExtend.recordPush(1, 0);
                            } else if (response.data.record == 0) { // 没有录制权限
                                $rootScope.drpengExtend.mainScope.toggle('dialog-no-authority', true);
                                $rootScope.drpengExtend.noAuthoTip = 'record'
                            }
                        } else {
                            alert(response.data.message);
                        }
                    })
                    .catch(function (error) {
                        console.warn("服务器内部错误！")
                    })
            }
        },
        // 录制推流
        recordPush (recordparm, liveparm) {
            let url = applicationSettings.apiServerUrl + '/v1/streaming/rtmp/';
            let data = {
                "meetingRoomNum": $rootScope.drpengExtend.alais,
                "pin": $rootScope.drpengExtend.getPassword(),
                "token": $rootScope.drpengExtend.mainScope.connection.getToken(),
                "recordStatus": recordparm,
                "liveStatus": liveparm
            }
            $http({
                method: 'POST',
                url: url,
                data: data,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        $rootScope.drpengExtend.orgID = response.data.data.appName;
                        $rootScope.drpengExtend.recordFileName = response.data.data.recordName;
                        $rootScope.drpengExtend.record(); // 录制推流成功后 进行录制
                        $rootScope.drpengExtend.isOwnRecord = true;
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
        },
        // 录制
        record () {
            let that = this
            var url = applicationSettings.apiServerUrl + '/v1/streaming/record/';
            var data = {
                orgId: $rootScope.drpengExtend.orgID,
                fileName: $rootScope.drpengExtend.recordFileName,
                recordStatus: 1,
            }
            $http({
                method: 'POST',
                url: url,
                data: data,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        // 获取到当前时间戳 即为录制开始时间 目的是为了计算时间差
                        $rootScope.drpengExtend.recordStartTime = Date.now();
                        // 设置直播的状态为进行中 页面上可以根据这个转换成计时的状态
                        $rootScope.drpengExtend.isRecording = true;
                        // 开始录制的计时
                        $rootScope.drpengExtend.recordTimeCount();
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    alert('网络问题或服务器内部错误，请稍后重试!')
                })
        },
        // 录制计时器控制
        recordTimeCount () {
            let that = this;
            let startTime = $rootScope.drpengExtend.recordStartTime;
            // 获取当前时间与开始时间的差值 并转换为指定的格式
            $rootScope.drpengExtend.recordTimeStr = $rootScope.drpengExtend.getTimeBetween(startTime);

            $rootScope.drpengExtend.timer = $timeout(function () {
                $rootScope.drpengExtend.recordTimeCount()
            }, 1000)
        },
        // 录制停止
        stopRecord () {
            let that = this;
            let url = applicationSettings.apiServerUrl + '/v1/streaming/record/' + $rootScope.drpengExtend.orgID + '/' + $rootScope.drpengExtend.recordFileName;
            $http({
                method: 'PUT',
                url: url,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        $rootScope.drpengExtend.recordTimeStr = '00:00:00';   // 清零录制时间
                        $rootScope.drpengExtend.isRecording = false;   // 设置录制状态 false：不在进行中
                        $rootScope.drpengExtend.isOwnRecord = false;
                        // 调pexip接口 删除这个参会者（rtmp流会作为一个参会者）
                        let url =
                            "https://"+applicationSettings.serverAddress +
                            "/api/client/v2/conferences/" + $rootScope.drpengExtend.orgID + "/" + "participants/"
                            + $rootScope.drpengExtend.recordRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url,
                            data: '',
                            headers: {
                                'token': $rootScope.drpengExtend.mainScope.connection.getToken(),
                                'pin': $rootScope.drpengExtend.getPassword()
                            }
                        })
                            .then(function (data) {
                                $rootScope.drpengExtend.recordRtmpParticipant = false;
                                $rootScope.drpengExtend.isRecording = false;

                                alert($translate.instant('IDS_CONFERENCE_END_RECORDING'));
                            })

                    } else {    // 录制停止失败
                        alert(response.data.mesage)
                    }
                })
                .catch(function (error) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
        },
        /***************************************直播功能********************************************************/
        // 获取已预约的直播列表
        getReservationLiveList () {
            let that = this;
            let url = applicationSettings.apiServerUrl + '/v1/streaming/' + $rootScope.drpengExtend.alais + '/availableLiveList';
            $http({
                method: 'GET',
                url: url,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    let responseData = response.data;
                    if (responseData.code == 0) {
                        $rootScope.drpengExtend.availableLiveList = responseData.data;
                    } else {
                        alert(responseData.mesage)
                    }
                })
                .catch(function (error) {
                    alert("服务器内部错误！")
                })
        },
        // 外层 开始直播
        outterStartLive () {
            let that = this;
            // 判断是否有直播权限
            let url = applicationSettings.apiServerUrl + '/v1/streaming/meetingRoomNum/' + $rootScope.drpengExtend.alais + '/streams';
            $http({
                method: 'get',
                url: url,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    if (response.data.code == 0) {
                        $rootScope.drpengExtend.orgID = response.data.orgId;
                        // 有直播权限
                        if (response.data.live == 1) {
                            $rootScope.drpengExtend.getReservationLiveList();
                            // 显示预约直播弹框
                            $rootScope.drpengExtend.mainScope.toggle('dialog-reservation-live', true);
                        } else if (response.data.live == 0) { // 没有直播权限
                            $rootScope.drpengExtend.mainScope.toggle('dialog-no-authority', true);
                            $rootScope.drpengExtend.noAuthoTip = 'live'
                        }
                    } else {
                        alert(response.data.message);
                    }
                })
                .catch(function (error) {
                    console.warn("服务器内部错误！")
                })
        },
        // 点击开始直播按钮
        startLiveClick () {
            let that = this;
            // 判断直播是否能开始 条件：参会者数量如果为1，且是“会控”，则此时还能进行直播
            let participants = $rootScope.drpengExtend.mainScope.connection.participants;
            let personNum = $rootScope.drpengExtend.getPropertyCount(participants);

            if (personNum <= 1 && participants.displayName == '会控') {
                alert("会议还未开始，请开始后再操作");
                return ;
            }
            $rootScope.drpengExtend.livePush();
        },
        // 直播推流
        livePush () {
            let that = this;
            var url = applicationSettings.apiServerUrl + '/v1/streaming/bookLive/' + $rootScope.drpengExtend.selectLiveID + '/pushRtmp?token=' + $rootScope.drpengExtend.mainScope.connection.getToken();
            $http({
                method: 'GET',
                url: url,
                data: '',
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    let resData = response.data;
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    if (resData.code == "0") {
                        $rootScope.drpengExtend.liveFileName = resData.rtmpName;
                        $rootScope.drpengExtend.startLive();
                    } else {
                        alert(resData.message)
                    }
                })
                .catch(function (error) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
        },
        // 直播
        startLive () {
            let that = this;
            var url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + $rootScope.drpengExtend.orgID + '/' + $rootScope.drpengExtend.liveFileName + '/1';
            $http({
                method: 'post',
                url: url,
                headers: { "Content-Type": "application/json" }
            })
                .then((response) => {
                    if (response.data.code == "0") {
                        $rootScope.drpengExtend.isOwnLive = true;
                        $rootScope.drpengExtend.isLiving = true;
                        $rootScope.drpengExtend.liveStartTime = Date.now();
                        $rootScope.drpengExtend.liveTimeCount();
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    alert("服务器内部错误！")
                })
        },
        // 直播计时器控制
        liveTimeCount () {
            let that = this;
            let startTime = $rootScope.drpengExtend.liveStartTime;

            $rootScope.drpengExtend.liveTimeStr = $rootScope.drpengExtend.getTimeBetween(startTime);

            $rootScope.drpengExtend.liveTimer = $timeout(function () {
                $rootScope.drpengExtend.liveTimeCount()
            }, 1000)
        },
        // 停止直播
        stopLive () {
            let that = this;
            let url = applicationSettings.apiServerUrl + '/v1/streaming/live/' + $rootScope.drpengExtend.orgID + '/' + $rootScope.drpengExtend.liveFileName;
            $http({
                method: 'PUT',
                url: url,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    if (response.data.code == 0) {
                        $rootScope.drpengExtend.isOwnLive = false;
                        let url =
                            "https://"+applicationSettings.serverAddress +
                            "/api/client/v2/conferences/" + $rootScope.drpengExtend.orgID + "/" + "participants/"
                            + $rootScope.drpengExtend.liveRtmpParticipant.uuid + "/disconnect";
                        $http({
                            method: 'POST',
                            url: url,
                            data: '',
                            headers: {
                                'token': $rootScope.drpengExtend.mainScope.connection.getToken(),
                                'pin': $rootScope.drpengExtend.getPassword()
                            }
                        })
                            .then(function(data) {
                                $rootScope.drpengExtend.liveRtmpParticipant = false;
                                $rootScope.drpengExtend.isLiving = false;
                                alert($translate.instant('IDS_LIVING_END'));
                            })
                    } else {
                        alert(response.data.message)
                    }
                })
                .catch(function (error) {
                    $rootScope.drpengExtend.mainScope.toggle('loading', false);
                    alert("服务器内部错误！")
                })
        },
        /***************************************公共方法********************************************************/
        // 获取对象的长度
        getPropertyCount (obj) {
            let n, count = 0;
            for(n in obj){
                if(obj.hasOwnProperty(n)){
                    count++;
                }
            }
            return count;
        },
        // 抽取出来的获取时间差的方法
        getTimeBetween (startTime) {
            let hours = (Math.floor((Date.now() - startTime) / 1000 / 60 / 60) % 60) + '' ;
            let minutes = (Math.floor((Date.now() - startTime) / 1000 / 60) % 60) + '';
            let seconds = (Math.round((Date.now() - startTime) / 1000) % 60) + '';

            if (hours.length === 1) hours = '0' + hours;
            if (minutes.length === 1) minutes = '0' + minutes;
            if (seconds.length === 1) seconds = '0' + seconds;

            return hours + ':' + minutes + ':' + seconds;
        },
        // 用来获取rtmp流的状态（直播或者录制）
        liveOrRecordStatus(flag) {
            let that = this;

            let rtmpURL = null;
            rtmpURL = (flag === 0 ? $rootScope.drpengExtend.recordRtmpParticipant : $rootScope.drpengExtend.liveRtmpParticipant);

            let worldtime;
            let recordstart;
            let livestart;

            let url = applicationSettings.apiServerUrl + '/v1/streaming/rtmpstatus/?rtmpUrl=' + rtmpURL.uri;

            $http({
                method: 'GET',
                url: url,
                asyn: false,
                headers: { "Content-Type": "application/json" }
            })
                .then(function (response) {
                    let responseData = response.data;
                    if (responseData.code == "0") {
                        let responseDataDetail = responseData.data;
                        $rootScope.drpengExtend.orgID = responseDataDetail.orgId;

                        recordstart = responseData.time;
                        livestart = responseData.time;
                        worldtime = responseData.time;

                        // 录制的相关信息
                        if (responseDataDetail.recordStatus == 1) {
                            $rootScope.drpengExtend.permissionRecord = true;
                            $rootScope.drpengExtend.isRecording = true;
                            let _worldTime = new Date(worldtime);
                            let _recordStart = new Date(recordstart);

                            let timeOffset = Date.now() - _worldTime.getTime();
                            let localRecordStart = _recordStart.getTime() + timeOffset;

                            $rootScope.drpengExtend.recordStartTime = localRecordStart;
                            $rootScope.drpengExtend.recordTimeCount();
                        }
                        // 直播的相关信息
                        if (responseDataDetail.liveStatus == 1) {
                            $rootScope.drpengExtend.permissionLive = true;
                            $rootScope.drpengExtend.isLiving = true;

                            let _worldTime = new Date(worldtime);
                            let _liveStart = new Date(livestart);

                            let timeOffset = Date.now() - _worldTime.getTime();
                            let localLiveStart = _liveStart.getTime() + timeOffset;

                            $rootScope.drpengExtend.liveStartTime = localLiveStart;
                            $rootScope.drpengExtend.liveTimeCount();
                        }
                    } else {
                        if (flag === 0) {
                            $rootScope.drpengExtend.permissionRecord = true;
                            $rootScope.drpengExtend.isRecording = true;
                            $rootScope.drpengExtend.recordStartTime = Date.now();
                            $rootScope.drpengExtend.recordTimeCount();
                        } else if (flag === 1) {
                            $rootScope.drpengExtend.permissionLive = true;
                            $rootScope.drpengExtend.isLiving = true;
                            $rootScope.drpengExtend.liveStartTime = Date.now();
                            $rootScope.drpengExtend.liveTimeCount();
                        }
                    }
                })
                .catch(function (error) {
                    alert("服务器内部错误!")
                })
        },
        // 当在设置中修改了语言后，立即更新
        updateLanguage () {
            $translate.use($localStorage.language);
        },
        // 直接在地址栏中输入地址并给出匹配的token，允许直接进入到会议中（不需要登陆的一些判断）
        if (token) {
            let mainControllerScope = this.mainScope;
            $http.get(applicationSettings.apiServerUrl + '/v1/abroad/checkToken/?token=' + $location.search().token)
                .then(function (res) {
                    console.log(res);
                    // res.data = {
                    //     code: "0",
                    //     guestPwd: "123456",
                    //     meetingRoomNum: "700321",
                    //     message: "成功",
                    // }
                    if (res.data.code != '0') {
                        return
                    }
                    var conferenceNum = res.data.meetingRoomNum;
                    var guestPwd = res.data.guestPwd;

                    mainControllerScope.params.pin = guestPwd;
                    mainControllerScope.params.conference = conferenceNum;

                    console.log('try login:\n',
                        conferenceNum,
                        '访客',
                        guestPwd,
                        undefined,
                        mainControllerScope.params.extension);
                    mainControllerScope.login(
                        conferenceNum,
                        '访客',
                        guestPwd,
                        undefined,
                        mainControllerScope.params.extension
                    );
                })
        }
    }
    $rootScope.$on('call::connected', function (event, data) {
        console.info('[drpeng]','call::connected事件')
        let alias = data.alias.split('@')[0],
            uuid = data.uuid;

        $rootScope.drpengExtend.isChair = data.isChair;
        $rootScope.drpengExtend.alais = alias;
        $rootScope.drpengExtend.uuid = uuid;
        $rootScope.drpengExtend.displayName = data.displayName;
        websocketService.connect(alias, uuid);
        // 当接收到举手列表更新事件后 执行的代码
        websocketService.addHandUpListReceiveListener((list) => {
            $rootScope.drpengExtend.handupList = list || [];
            setTimeout(function () {
                $rootScope.$apply();
            })
        })
    });
    // 连接断开的事件
    $rootScope.$on('drpeng::disconnect', function (event) {
        websocketService.disconnect()
    });
    // 监听新增参会者事件
    $rootScope.$on('drpeng::participantCreate', function (event, participant) {
        setTimeout(() => {
            if (participant['protocol'] === 'rtmp') {
                // rtmp://118.144.155.108/26/700025_20161116_171148
                var rtmpArray = participant['uri'].split("/");
                if (rtmpArray[0] == "rtmp:"){
                    // temp格式 700025_20161116_171148
                    let temp = rtmpArray[rtmpArray.length-1];
                    if (/^[0-9]/.test(temp) && (temp.split("_").length == 3)) {
                        $rootScope.drpengExtend.recordRtmpParticipant = participant;
                        $rootScope.drpengExtend.recordRtmpUUID = participant.uuid;     // 用于以后删除的监听
                        let uriArray = participant.uri.split('/');
                        $rootScope.drpengExtend.recordFileName = uriArray[uriArray.length - 1];
                        // 传入一个标志 用来判断是获取直播还是录制的状态 0 表示录制；1 表示直播
                        $rootScope.drpengExtend.liveOrRecordStatus(0);
                    } else if (temp.indexOf('live_') != -1) {
                        $rootScope.drpengExtend.liveRtmpParticipant = participant;
                        $rootScope.drpengExtend.liveRtmpUUID = participant.uuid;
                        let uriArray = participant.uri.split('/');
                        $rootScope.drpengExtend.liveFileName = uriArray[uriArray.length - 1];
                        $rootScope.drpengExtend.liveOrRecordStatus(1);
                    }
                }
            }
        }, 1200)
    });
    // 监听删除参会者事件
    $rootScope.$on('drpeng::participantDelete', function (event, participantUUID) {
        if (participantUUID.uuid == $rootScope.drpengExtend.recordRtmpUUID ) {
            $rootScope.drpengExtend.recordRtmpParticipant = false;
            $rootScope.drpengExtend.isRecording = false;
            $rootScope.drpengExtend.recordTimeStr = '00:00:00';
            $rootScope.drpengExtend.recordRtmpUUID = null;
        } else if (participantUUID.uuid == $rootScope.drpengExtend.liveRtmpUUID) {
            $('#J-start-live').removeClass('disabled');
            $rootScope.drpengExtend.liveRtmpParticipant = false;
            $rootScope.drpengExtend.isLiving = false;
            $rootScope.drpengExtend.liveTimeStr = '00:00:00';
            $rootScope.drpengExtend.liveRtmpUUID = null;
        }
    });
    // 监听layout改变事件
    $rootScope.$on('drpeng::layout', function (event, msg) {
        let view = msg.view;
        $rootScope.drpengExtend.settings.layoutView = view;
        let splitScreenHtml = null;
        let translate = null;

        if (view === "1:0") {
            translate = $translate.instant('IDS_CONFERENCE_A_MAIN_SCREEN');
            splitScreenHtml = '<span class="nav_main-screen-img"></span><span>'+translate+'</span>';
        } else if (view === "4:0") {
            translate = $translate.instant('IDS_CONFERENCE_FOUR_POINT_SCREEN');
            splitScreenHtml = '<span class="nav_five-split-screen-img"></span><span>'+translate+'</span>';
        } else if (view === "1:7") {
            translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_SEVEN_SCREEN');
            splitScreenHtml = '<span class="nav_one-seven-screen-img"></span><span>'+translate+'</span>';
        } else if (view === "1:21") {
            translate = $translate.instant('IDS_CONFERENCE_ONE_ADD_TWENTY_ONE_SCREEN');
            splitScreenHtml = '<span class="nav_one-twenty-one-screen-img"></span><span>'+translate+'</span>';
        } else if (view === "2:21") {
            translate = $translate.instant('IDS_CONFERENCE_TWO_ADD_TWENTY_ONE_SCREEN');
            splitScreenHtml = '<span class="nav_two-twenty-one-screen-img"></span><span>'+translate+'</span>';
        }
        $('#split-screen-mode').html(splitScreenHtml);
    });
    /***************************************************************************************************************/
    if (navigator.userAgent.indexOf("Chrome") != -1) {
        $scope.chrome_ver = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
    } else {
        $scope.chrome_ver = 0;
    }

    if (navigator.userAgent.indexOf("Firefox") != -1) {
        $scope.firefox_ver = parseInt(window.navigator.userAgent.match(/Firefox\/(\d+)\./)[1], 10);
        if ($scope.firefox_ver > 51 || applicationSettings.firefoxScreensharing === true) {
            platformSettings.screenshareSupported = true;
        }
    } else {
        $scope.firefox_ver = 0;
    }

    if (navigator.userAgent.indexOf("Edge") != -1) {
        $scope.edge_ver = parseInt(window.navigator.userAgent.match(/Edge\/\d+\.(\d+)/)[1], 10);
        $scope.chrome_ver = 0;
    } else {
        $scope.edge_ver = 0;
    }

    $scope.update = function() {
        $scope.$apply(function() {});
    };

    if ($scope.edge_ver > 10527) {
        var adapterScript = document.createElement('script');
        document.body.appendChild(adapterScript);
        adapterScript.src = $sce.trustAsResourceUrl('js/vendor/adapter.js');
        platformSettings.hasWebRTC = true;
        platformSettings.realHasWebRTC = true;
        if ($scope.edge_ver < 14393) {
            applicationSettings.enableFullMotionPresentation = false;
        }
    }

    $scope.forceFlashChanged = function() {
        if ($scope.params.forceFlash) {
            platformSettings.hasWebRTC = false;
        } else {
            platformSettings.hasWebRTC = platformSettings.realHasWebRTC;
        }
    };
    $scope.forceFlashChanged();

    function loadPexRTC(host) {
        var deferred = $q.defer();
        var pexrtcScript = document.createElement('script');
        document.body.appendChild(pexrtcScript);
        pexrtcScript.onload = deferred.resolve;
        pexrtcScript.onerror = deferred.reject;
        pexrtcScript.src = $sce.trustAsResourceUrl('https://' + host + '/static/webrtc/js/pexrtc.js');
        $log.log('Loading pexrtc', pexrtcScript.src);
        return deferred.promise;
    }

    $scope.getSelectedDevices = function() {
        var devices = [];
        if ($localStorage.cameraSourceId) {
            devices.push({
                kind: 'video',
                id: $localStorage.cameraSourceId
            });
        }
        if ($localStorage.microphoneSourceId) {
            devices.push({
                kind: 'audio',
                id: $localStorage.microphoneSourceId
            });
        }
        if ($localStorage.audioOutputId) {
            devices.push({
                kind: 'output',
                id: $localStorage.audioOutputId
            });
        }
        return devices;
    };

    $scope.resetInvalidDevices = function() {
        //devices是选中的音频模式
        var devices = $scope.getSelectedDevices();
        return mediaDevicesService.getInvalidDevices(devices)
            .then(function(result) {
                angular.forEach(result.invalidDevices, function(invalidDevice) {
                    switch (invalidDevice.kind) {
                        case 'video':
                            $localStorage.cameraSourceId = (result.validDevices.video.length) ? null : false;
                            break;
                        case 'audio':
                            $localStorage.microphoneSourceId = null;
                            break;
                        case 'output':
                            $localStorage.audioOutputId = null;
                            break;
                    }
                });
                return result.invalidDevices;
            });
    };

    $scope.loginApp = function(alias, displayName, skipDeviceSelectionDialog) {
        $log.log('loginApp', alias, displayName, skipDeviceSelectionDialog);
        if(alias.length === 0) {

            alert($translate.instant('IDS_PARTICIPANT_ADD_TEXT'));
            return
        }
        $scope.resetInvalidDevices()
            .then(function(invalidDevices) {
                if (invalidDevices.length || (!skipDeviceSelectionDialog && $scope.params.media && $scope.localStorage.promptMedia)) {
                    $log.log('Showing escalate dialog');
                    $scope.params.name = displayName;
                    $scope.params.conference = alias;
                    $scope.toggle('dialog-escalate', true);
                    return;
                }
                if ($scope.globalService.join) {
                    $scope.globalService.join(alias, displayName, undefined, undefined, $scope.params.media, $scope.params.audioonly);
                    $scope.params.conference = '';
                } else {
                    $scope.login(alias, displayName);
                }
            });
    };

    //新加的方法，点击对登录模块的隐藏和显示
    $scope.showBtn= function () {
        var view = document.getElementById("rootBottom");
        if ($rootScope.drpengExtend.isOnClick === false) {
            //                this.innerHTML="";

            view.style.cssText = "-webkit-animation-name:rootShowAnimation; -webkit-animation-duration:0.8s;-webkit-animation-fill-mode:forwards ";
            $rootScope.drpengExtend.isOnClick=true;
        }
        else {
            //                this.innerHTML="登录"
            view.style.cssText = "-webkit-animation-name:rootHiddenAnimation; -webkit-animation-duration:0.6s;-webkit-animation-fill-mode:forwards ";
            $rootScope.drpengExtend.isOnClick = false;
        }
    }

        //新加的方法，点击进入会议，进入历史记录页面
    $scope.enterHistory = function(alias, displayName) {
                    $scope.globalService.enter(alias, displayName);
    };

    $scope.setErrorMessage = function(message) {
        $scope.errorMessage = message;
        if (platformSettings.isAndroidClient) {
            $translate(message).then(function(result) {
                window.srv.service('toast', result);
            });
        }
    };

    function resetConnection() {
        $scope.connection = {
            participants: {},
            stage: [],
            participantAdd: function(uri, protocol, role, userParams) {
                dialHistory.add(uri, protocol, role);
                if (typeof userParams === 'string') {
                    userParams = {
                        presentation_uri: userParams
                    };
                }
                reportingService.send(
                    'dialParticipant', {
                        protocol: protocol,
                        role: role,
                        uuid: $scope.connection.data.uuid,
                        usedPresentation: userParams && userParams.presentation_uri ? true : false
                    },
                    $scope.connection.data.analyticsEnabled);

                $scope.call.participantAdd(uri, protocol, role, userParams);
            },
            participantAddDone: function() {
                $timeout(function() {
                    delete $scope.connection.dialOutState;
                }, 2500);
            },
            participantAddCancel: function() {
                angular.forEach($scope.connection.dialOutState.result, function(uuid) {
                    $scope.call.participantDisconnect({
                        uuid: uuid
                    });
                });
                delete $scope.connection.dialOutState;
            },
            participantAddIgnore: function() {
                delete $scope.connection.dialOutState;
            },
            participantToggleMute: function(participant) {
                $scope.call.participantToggleMute(participant);
            },
            participantUnlock: function(participant) {
                $scope.call.participantUnlock(participant);
            },
            participantTransfer: function(participant, conference_alias, role, pin) {
                $scope.call.participantTransfer(participant, conference_alias, role, pin,
                    function(result) {
                        if (!result) {
                            modal.alert('IDS_TRANSFER_FAILED');
                        }
                    });
            },
            participantDisconnect: function(participant) {
                $translate([
                    'IDS_PARTICIPANT_DISCONNECT',
                    'IDS_PARTICIPANT_DISCONNECT_MESSAGE'
                ], {
                    displayName: participant.displayName
                }).then(function(translations) {
                    modal.confirm(
                        translations.IDS_PARTICIPANT_DISCONNECT,
                        translations.IDS_PARTICIPANT_DISCONNECT_MESSAGE,
                        function() {
                            $scope.call.participantDisconnect(participant);
                        },
                        null,
                        'IDS_BUTTON_DISCONNECT');
                });
            },
            disconnectAll: function() {
                $scope.call.disconnectAll();
            },
            updateLayoutSettings: function (settings) {
                $scope.call.updateLayoutSettings(settings);
            },
            toggleCamera: function() {
                $scope.connection.cameraEnabled = !$scope.call.toggleCamera();
            },
            getToken: function () {
                return $scope.call.rtc.token;
            }
        };
    }

    var deferredHistoryEntry;

    $scope.login = function(alias, displayName, pin, token, extension) {
        $log.debug('$scope.login', alias, displayName, pin, token);
        $localStorage.media = $scope.params.media;
        $localStorage.audioonly = $scope.params.audioonly;

        $localStorage.conference = alias;
        $rootScope.drpengExtend.setPassword (pin);
        if (!platformSettings.isAndroidClient) {
            $localStorage.name = displayName;
        }
        $scope.errorMessage = '';

        if (!displayName) {
            $scope.setErrorMessage('IDS_SETTINGS_DISPLAY_NAME_PLACEHOLDER');
            return;
        }

        $scope.loadingConference = true;
        reportingService.send('callPlaced', null, serverSettings.analyticsReportingEnabled);

        if ($scope.call) {
            $log.debug('$scope.login: setting pin');
            $scope.call.connect(pin, extension);
            return;
        } else if (!$scope.connection) {
            resetConnection();

            var uri = $localStorage.defaultDomain && alias.search('@') < 0 ? alias + '@' + $localStorage.defaultDomain : alias;
            var vmrDetailsPromise = $scope.params.host ? $q.when([$scope.params.host]) : srvService.getVmrDetails(uri);
            vmrDetailsPromise.then(function(servers) {
                servers = $.unique(servers.filter(function(value) {
                    return !!value;
                }));

                $log.log('Got servers ' + servers);

                function tryNextServer() {
                    var server = servers.shift();
                    if (server) {
                        $log.log('Trying connection to', server);
                        loadPexRTC(server).then(function() {
                            if (applicationSettings.scripts) {
                                for (var i = 0; i < applicationSettings.scripts.length; i++) {
                                    var scriptElement = document.createElement('script');
                                    document.body.appendChild(scriptElement);
                                    scriptElement.src = applicationSettings.scripts[i];
                                }
                            }
                            deferredHistoryEntry = function() {
                                callHistory.add(
                                    $scope.params.remote_alias || uri,
                                    $scope.getConferenceAvatarUrl($scope.params.remote_alias || uri, server),
                                    $scope.params.remote_alias ? 'incoming' : 'outgoing');
                                deferredHistoryEntry = null;
                            };
                            if ($scope.params.remote_alias) {
                                deferredHistoryEntry();
                            }
                            $scope.call = new Call(
                                server,
                                uri,
                                displayName,
                                token,
                                $localStorage.registrationToken);
                        }, function(err) {
                            $log.log('Connection to', server, 'failed');
                            tryNextServer();
                        });
                    } else {
                        $log.log('Failed to load pexrtc');
                        $scope.errorMessage = 'IDS_CONNECTION_FAILED';
                        $scope.disconnect();
                    }
                }

                tryNextServer();
            });
        }
    };

    $scope.startMediaCall = function() {
        /* global swfobject */
        $log.log('startMediaCall');
        $scope.connection.connectingMedia = true;
        reportingService.send('escalate', {
                uuid: $scope.connection.data.uuid,
                audio: true,
                video: $scope.params.audioonly ? false : true,
                bandwidth: $localStorage.defaultBandwidth
            },
            $scope.connection.data.analyticsEnabled);

        if (!$scope.platformSettings.hasWebRTC) {
            $scope.useFlash = true;
            var unsubscribe = $rootScope.$on('flash::ready', function() {
                $log.debug('flash::ready');
                var flashElement = swfobject.getObjectById('flashvideo');
                unsubscribe();
                $scope.call.startCall(
                    $scope.params.audioonly ? 'audioonly' : 'rtmp',
                    $localStorage.cameraSourceId,
                    $localStorage.microphoneSourceId,
                    flashElement);
            });
        } else {
            $timeout(function() {
                $scope.call.startCall(
                    $scope.params.audioonly ? 'audioonly' : 'video',
                    $localStorage.cameraSourceId,
                    $localStorage.microphoneSourceId);
            }, 700); // Make sure the preview has released media
        }
    };

    $scope.disconnect = function(navigate, reason) {
        $log.debug('$scope.disconnect', navigate, reason);

        if ($scope.call) {
            if ($scope.call.presentationWindow) {
                $scope.call.presentationWindow.close(true);
                $scope.call.presentationWindow = null;
            }

            $scope.call.disconnect(reason);
        }
        if ($scope.errorMessage !== 'Call Failed: Invalid PIN') {
            delete $scope.pinRequested;
            delete $scope.extensionRequested;
        }
        if (navigate) {
            if (platformSettings.isDesktopClient && !$scope.errorMessage) {
                window.close();
            } else {
                window.location.href = window.location.href.split('#')[0];
            }
        } else {
            delete $scope.loadingConference;
            delete $scope.params.pin;
            delete $scope.params.extension;
            delete $scope.call;
            delete $scope.connection;
        }
    };

    $scope.cancelLogin = function() {
        delete $scope.errorMessage;
        $scope.disconnect(platformSettings.isDesktopClient);
    };

    var _oldOnBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = function() {
        $log.debug('MainController onbeforeunload');
        if (angular.isFunction(_oldOnBeforeUnload)) {
            _oldOnBeforeUnload();
        }
        $scope.disconnect(false, 'Browser closed');
    };

    $scope.$on('$destroy', function() {
        $log.debug('$destroy');
        $scope.disconnect();
    });

    if (window._initDesktopClientWindowHandlers) {
        window._initDesktopClientWindowHandlers($scope);
    }

    $scope.getConferenceAvatarUrl = function(alias, host) {
        return 'https://' + (host || document.domain) + '/api/client/v2/conferences/' + alias + '/avatar.jpg';
    };

    $scope.$on('call::pinRequested', function(event, required) {
        $log.debug('call::pinRequested', required);
        delete $scope.extensionRequested;
        $scope.loadingConference = false;
        if (angular.isDefined($scope.params.pin) || $scope.pinRequested) {
            $scope.call.connect($scope.params.pin);
            delete $scope.params.pin;
            $scope.loadingConference = true;
        }
        $scope.pinRequested = {
            required: required,
            role: required ? null : $scope.params.role || 'guest'
        };
    });

    $scope.$on('call::extensionRequested', function(event, required) {
        $log.debug('call::extensionRequested', required);
        $scope.loadingConference = false;
        if (angular.isDefined($scope.params.extension) || $scope.extensionRequested) {
            $scope.call.connect(null, $scope.params.extension);
            delete $scope.params.extension;
            $scope.loadingConference = true;
        }
        $scope.extensionRequested = {
            required: required
        };
    });

    $scope.$on('call::disconnected', function(event, reason) {
        $rootScope.drpengExtend.mainScope.toggle('loading', false);
        modal.alert('IDS_MESSAGE_DISCONNECTED', reason ? reason : 'Media process disconnected', function() {
            delete $scope.errorMessage;
            $scope.disconnect(true);
        });
    });

    $scope.$on('call::connected', function(event, data) {
        $timeout(function() {
            reportingService.send(
                'callConnected', {
                    uuid: data.uuid
                },
                data.analyticsEnabled);
            $log.debug('call::connected', data);

            if (!$scope.params.media && $scope.params.escalate) {
                delete $scope.params.escalate;
                $scope.toggle('dialog-escalate', true);
            }

            if (angular.isFunction(deferredHistoryEntry)) {
                deferredHistoryEntry();
            }

            $scope.connection.data = data;
            $scope.connection.data.isChair = $scope.params.forceguest ? false : data.isChair;
            delete $scope.loadingConference;
            delete $scope.params.pin;
            $location.url($location.path());
            // window.history.pushState(null, 'any', $location.absUrl());
            // window.onpopstate = function(event) {
            //     $log.debug('window.onpopstate', event);
            //     $scope.$apply(function() {
            //         $scope.disconnect();
            //     });
            // };
        });
    });

    $scope.$on('call::error', function(event, reason) {
        $timeout(function() {
            $log.debug('call::error', reason);
            modal.close();
            $scope.setErrorMessage(reason);
            $scope.disconnect(false, reason);
        });
    });
    $scope.$on('call::transfer', function(event, alias) {
        $log.debug('call::transfer', alias);
        $rootScope.$broadcast('call::presentationStopped');
        $scope.params.conference = alias;
        $scope.loadingConference = true;
        resetConnection();
    });
    $scope.$on('call::remoteMediaStream', function(event, stream, type) {
        $log.debug('call::remoteMediaStream', stream, type);
        delete $scope.connection.connectingMedia;
        switch (type) {
            case 'video':
                $scope.connection.remoteAudioStream = $sce.trustAsResourceUrl(stream);
                $scope.connection.remoteVideoStream = $sce.trustAsResourceUrl(stream);
                break;
            case 'rtmp':
                $scope.connection.remoteAudioStream = $sce.trustAsResourceUrl(stream);
                $scope.connection.remoteVideoStream = $sce.trustAsResourceUrl(stream);
                if ($localStorage.cameraSourceId !== false) {
                    $scope.connection.localVideoStream = $sce.trustAsResourceUrl(stream);
                }
                if (localStorage.microphoneSourceId !== false) {
                    $scope.connection.localAudioStream = $sce.trustAsResourceUrl(stream);
                }
                break;
            case 'audioonly':
                $scope.connection.remoteAudioStream = $sce.trustAsResourceUrl(stream);
                delete $scope.connection.remoteVideoStream;
                if (!platformSettings.hasWebRTC) {
                    delete $scope.connection.localVideoStream;
                    $scope.connection.localAudioStream = $sce.trustAsResourceUrl(stream);
                }
        }
    });
    $scope.$on('call::localMediaStream', function(event, stream, type) {
        $log.debug('call::localMediaStream', stream, type);
        switch (type) {
            case 'video':
            case 'rtmp':
                if ($localStorage.cameraSourceId !== false) {
                    $scope.connection.cameraEnabled = true;
                    $scope.connection.localVideoStream = $sce.trustAsResourceUrl(stream);
                }
                if (localStorage.microphoneSourceId !== false) {
                    $scope.connection.localAudioStream = $sce.trustAsResourceUrl(stream);
                }
                break;
            case 'audioonly':
                if (localStorage.microphoneSourceId !== false) {
                    $scope.connection.localAudioStream = $sce.trustAsResourceUrl(stream);
                }
        }
    });
    $scope.$on('call::participantUpdate', function(event, participant) {
        if ($scope.connection.dialOutState && $scope.connection.dialOutState.result.indexOf(participant.uuid) !== -1) {
            $scope.connection.dialOutState.waiting.splice($scope.connection.dialOutState.waiting.indexOf(participant.uuid), 1);
            if (!participant.isConnecting) {
                $scope.connection.dialOutState.state = 'IDS_PARTICIPANT_ADD_CONNECTED';
                $scope.connection.participantAddDone();
            }
        }
        if (participant.uuid in $scope.connection.participants) {
            angular.copy(participant, $scope.connection.participants[participant.uuid]);
        } else {
            $scope.connection.participants[participant.uuid] = participant;
        }
        if ($scope.connection.data && participant.uuid === $scope.connection.data.uuid) {
            $scope.connection.participant = $scope.connection.participants[participant.uuid];
            $scope.connection.participant.isSelf = true;
        } else if (participant.isWaiting && $scope.connection.participant && participant.startTime > $scope.connection.participant.startTime) {
            $translate('IDS_MESSAGE_PARTICIPANT_WAITING', {
                displayName: participant.displayName
            }).then(toast.message);
        }

        if ($scope.connection.data) {
            var conferenceHasMedia = false;
            angular.forEach($scope.connection.participants, function(p) {
                if (p.hasMedia && p.serviceType === 'conference') {
                    conferenceHasMedia = true;
                }
            });
            $scope.connection.data.hasStartedMedia = conferenceHasMedia;
        }
    });
    $scope.$on('call::roleUpdated', function(event, isChair) {
        if (isChair !== $scope.connection.data.isChair) {
            $scope.connection.data.isChair = isChair;
            $translate(isChair ? 'IDS_ROLE_UPDATED_TO_HOST' : 'IDS_ROLE_UPDATED_TO_GUEST').then(toast.message);
        }
    });
    $scope.$on('call::participantDeleted', function(event, uuid) {
        $log.debug('call::participantDeleted', uuid);
        delete $scope.connection.participants[uuid];

        if ($scope.connection.dialOutState && $scope.connection.dialOutState.result.indexOf(uuid) !== -1) {
            $scope.connection.dialOutState.result.splice($scope.connection.dialOutState.result.indexOf(uuid), 1);
            if (!$scope.connection.dialOutState.result.length) {
                $scope.connection.dialOutState.state = 'IDS_PARTICIPANT_ADD_DISCONNECTED';
                $scope.connection.participantAddDone();
            }
        }
    });
    $scope.$on('call::participantAdd', function(event, participant) {
        $log.debug('call::participantAdd', participant);
        $scope.connection.dialOutState = participant;
        if (!participant.result.length) {
            $scope.connection.dialOutState.state = 'IDS_PARTICIPANT_ADD_FAILED';
            $scope.connection.participantAddDone();
        } else {
            $scope.connection.dialOutState.state = 'IDS_PARTICIPANT_ADD_CONNECTING';
        }
    });
    $scope.$on('call::stageUpdated', function(event, stage) {
        angular.copy(stage, $scope.connection.stage);
    });

    $scope.$on('call::presentationStarted', function(event, name) {
        var nameMatch = /(.*)\s<(.*)>/.exec(name);
        $translate('IDS_PRESENTATION_NAME', {
                displayName: nameMatch && (nameMatch[1] || nameMatch[2]) || name
            })
            .then(function(name) {
                $scope.call.presentationName = name;
                $scope.call.presentationMaximized = true;
            });
        if ($localStorage.fullMotionPresentationByDefault && platformSettings.hasWebRTC && applicationSettings.enableFullMotionPresentation) {
            $scope.call.startPresentationVideo();
        }
    });
    $scope.$on('call::presentationStopped', function(event) {
        $log.debug('call::presentationStopped');
        delete $scope.call.presentationName;
        delete $scope.call.presentationImgSrc;
        delete $scope.call.presentationVideoSrc;
    });

    function closePresentationWindowOnEnd(event) {
        if ($scope.call && $scope.call.presentationWindow) {
            $scope.call.presentationWindow.close();
            $log.debug('closing presentation window');
        }
    }
    $scope.$on('call::presentationStopped', closePresentationWindowOnEnd);
    $scope.$on('call::screenshareStopped', closePresentationWindowOnEnd);

    $scope.popOutPresentation = function() {
        $log.log('popOutPresentation');
        if (!$scope.call.presentationWindow) {
            if (platformSettings.isDesktopClient) {
                $scope.call.presentationWindow = nw.Window.open(
                    '../templates/presentation-window.html', {
                        id: 'presentationWindow',
                        title: $scope.call.presentationName,
                        width: 800,
                        height: 600,
                        // toolbar: false,
                        focus: true,
                        show: false,
                        icon: 'configuration/favicon.png',
                    },
                    function(win) {
                        $timeout(function() {
                            $scope.call.presentationWindow = win;
                        });
                        win.on('close', function(event) {
                            $timeout(function() {
                                $scope.call.presentationWindow.close(true);
                                $scope.call.presentationWindow = null;
                                $scope.call.refreshPresentation();
                            });
                        });
                        win.once('loaded', function() {
                            $timeout(function() {
                                $rootScope.$broadcast(
                                    'call::presentationUpdate',
                                    $sce.getTrustedResourceUrl($scope.call.presentationImgSrc));
                                $rootScope.$broadcast(
                                    'call::presentationVideoUpdate',
                                    $sce.getTrustedResourceUrl($scope.call.presentationVideoSrc));
                                $scope.call.presentationWindow.show();
                                $scope.call.presentationWindow.focus();
                            });
                        });
                    });

            } else {
                $log.log('popOutPresentation: creating window');

                window.presentationWindowOnLoad = function() {
                    $timeout(function() {
                        $log.log('presentationWindow.onload');
                        $rootScope.$broadcast(
                            'call::presentationUpdate',
                            $sce.getTrustedResourceUrl($scope.call.presentationImgSrc));
                        $rootScope.$broadcast(
                            'call::presentationVideoUpdate',
                            $sce.getTrustedResourceUrl($scope.call.presentationVideoSrc));

                        $scope.call.presentationWindow.onbeforeunload = function() {
                            $timeout(function() {
                                $log.log('presentationWindow.onbeforeunload');
                                if ($scope.call) {
                                    $scope.call.presentationWindow = null;
                                    $scope.call.refreshPresentation();
                                }
                            });
                        };
                    });
                    delete window.presentationWindowOnLoad;
                };

                $scope.call.presentationWindow = window.open(
                    'templates/presentation-window.html',
                    $scope.call.presentationName,
                    'width=800,height=600,directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no');
            }
        }
    };

    $scope.$on('call::screenShareMissing', function(event, stage) {
        toggleService.toggle('dialog-screen-share-missing', true);
    });

    var lastMicActivity = 0;
    $scope.$on('call::onMicActivity', function(event) {
        if ($scope.call && $scope.call.microphoneMuted && (Date.now() - lastMicActivity > 30000)) {
            lastMicActivity = Date.now();
            $scope.micActivity = true;
            $timeout(function() {
                delete $scope.micActivity;
            }, 5000);
        }
    });

    if ($scope.params.join && !$scope.params.token) {
        $scope.login(
            $scope.params.conference,
            $scope.params.name,
            $scope.params.pin,
            undefined,
            $scope.params.extension);
    } else if ($scope.params.join && $scope.params.token) {
        $scope.login(
            $scope.params.conference,
            $scope.params.name,
            '',
            $scope.params.token);
    }
});
