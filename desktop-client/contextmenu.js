/* global $, nw */

if (angular.isDefined(window.process) && window.process.platform) {

angular.module('pexapp')

.directive('input', function($translate) {
    'use strict';
    return {
        restrict: 'E',
        link: function link(scope, element, attrs) {
            if (attrs.type === 'text') {
                $translate([
                        'IDS_DESKTOPCLIENT_MENU_CUT',
                        'IDS_DESKTOPCLIENT_MENU_COPY',
                        'IDS_DESKTOPCLIENT_MENU_PASTE'
                    ])
                    .then(function(ids) {
                        var menu = new nw.Menu();
                        menu.append(new nw.MenuItem({
                            label: ids.IDS_DESKTOPCLIENT_MENU_CUT,
                            click: function() {
                                document.execCommand('cut');
                            }
                        }));
                        menu.append(new nw.MenuItem({
                            label: ids.IDS_DESKTOPCLIENT_MENU_COPY,
                            click: function() {
                                document.execCommand('copy');
                            }
                        }));
                        menu.append(new nw.MenuItem({
                            label: ids.IDS_DESKTOPCLIENT_MENU_PASTE,
                            click: function() {
                                document.execCommand('paste');
                            }
                        }));

                        element[0].addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            menu.popup(e.x, e.y);
                            return false;
                        });
                    });
            }
        }
    };
})

.directive('body', function($rootScope, $translate) {
    'use strict';
    return {
        restrict: 'E',
        link: function link(scope, element, attrs) {
            $rootScope.$on('$translateChangeSuccess', function() {
                $translate([
                        // 'IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS',
                        // 'IDS_DESKTOPCLIENT_MENU_ALWAYS_ON_TOP'
                    ])
                    .then(function(translations) {
                        // var menu = new nw.Menu();
                        // menu.append(new nw.MenuItem({
                        //     type: 'checkbox',
                        //     label: translations.IDS_DESKTOPCLIENT_MENU_ALWAYS_ON_TOP,
                        //     click: function() {
                        //         nw.Window.get().setAlwaysOnTop(this.checked);
                        //     }
                        // }));
                        // menu.append(new nw.MenuItem({
                        //     label: translations.IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS,
                        //     click: function() {
                        //         nw.Window.get().showDevTools();
                        //     }
                        // }));

                        element[0].addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            menu.popup(e.x, e.y);
                            return false;
                        });
                    }, function() {
                        console.error('Failed to add context menu');
                    });
            });
        }
    };
})

.directive('historyEntry', function($timeout, $translate, callHistory) {
    'use strict';
    return {
        restrict: 'A',
        link: function link(scope, element, attrs) {
            $translate([
                    'IDS_BUTTON_EDIT',
                    'IDS_BUTTON_DELETE',
                ])
                .then(function(translations) {
                    var menu = new nw.Menu();
                    menu.append(new nw.MenuItem({
                        label: translations.IDS_BUTTON_EDIT,
                        click: function() {
                            $timeout(function() {
                                scope.params.conference = attrs.historyEntry;
                                $('#alias-field').focus();
                            });
                        }
                    }));
                    menu.append(new nw.MenuItem({
                        label: translations.IDS_BUTTON_DELETE,
                        click: function() {
                            $timeout(function() {
                                callHistory.remove(attrs.historyEntry);
                            });
                        }
                    }));

                    element[0].addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        menu.popup(e.x, e.y);
                        return false;
                    });
                }, function() {
                    console.error('Failed to add context menu');
                });
        }
    };
});

}
