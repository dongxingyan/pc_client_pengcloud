var applicationSettings = {
    // serverAddress: window.srv == undefined ? 'tp.cloudp.cc' : null, // Can be overridden with a host name or ip
    apiServerUrl: 'https://api.cloudp.cc/cloudpServer',
    webSocketUrl: 'api.cloudp.cc',
    orgManagementURL: 'https://www.cloudp.cc/admin_backstage/login.html',

    serverAddress: (window.srv || window.nw) ? 'tp.cloudp.cc' : window.location.host, // Can be overridden with a host name or ip

 //   serverAddress: window.srv == undefined ? 'test.cloudp.cc' : null, // Can be overridden with a host name or ip
    // apiServerUrl: 'https://api-dev.cloudp.cc/cloudpServer',
    // webSocketUrl: 'api-dev.cloudp.cc',
    defaultDialOutProtocol: 'sip', // sip | h323 | mssip | rtmp
    // orgManagementURL: 'http://118.144.248.18/admin_backstage/login.html',

    languages: {
        'English (US)': 'configuration/languages/en-us.json',
        '中文': 'configuration/languages/cn-cn.json',
        // 'Traditional Chinese': 'configuration/languages/cn-td.json'
    },

    bandwidths: [{
        name: 'IDS_BANDWIDTH_LOW',
        value: 192+64
    }, {
        name: 'IDS_BANDWIDTH_MEDIUM',
        value: 512+64
    }, {
        name: 'IDS_BANDWIDTH_HIGH',
        value: 1200+64
    }, {
        name: 'IDS_BANDWIDTH_MAXIMUM',
        value: 2400+64
    }],

    // Uncomment the next line and specify an img path to override conference-avatar:
    //overrideConferenceAvatar: 'configuration/themes/default/conference-avatar.jpg'
    overrideConferenceAvatar: 'configuration/themes/default/conference-avatar.jpg'
};

// Default configuration to apply to first-time users
var defaultUserSettings = {
    // language: 'configuration/languages/cn-cn.json',
    language: 'configuration/languages/en-us.json',

    defaultBandwidth: 576, // Make sure the value is in applicationSettings.bandwiths

    promptDisconnect: true,
    analyticsReportingEnabled: true,
    fullMotionPresentationByDefault: true,

    // 14版本多出的设置项
    startMedia: false,

    // 迁移自13版本的设置项
    promptMedia: true,
    muteOnJoin: false,
    startMinimized: false,
};
/*
void function () {
    var language,
        query = {};

    location.search.slice(1).split('&').forEach(function (item) {
        var temp = item.split('=');
        query[temp[0]] = temp[1];
    });


    if (query['language']) {
        language = query['language']
    } else {
        language = navigator.language.toLowerCase()
    }

    language = language.toLowerCase();

    if (language === 'zh-tw' || language === 'zh-hk') {
        defaultUserSettings.language = 'configuration/languages/cn-td.json';
    } else if (language === 'zh-cn') {
        defaultUserSettings.language = 'configuration/languages/cn-cn.json';
    } else {
        defaultUserSettings.language = 'configuration/languages/en-us.json';
    }
}();*/