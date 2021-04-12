var H5P = (window.H5P = window.H5P || {});
H5P.isFramed = window.self !== window.parent;
H5P.$window = H5P.jQuery(window);
H5P.instances = [];
if (document.documentElement.requestFullScreen) {
    H5P.fullScreenBrowserPrefix = "";
} else if (document.documentElement.webkitRequestFullScreen) {
    H5P.safariBrowser = navigator.userAgent.match(/version\/([.\d]+)/i);
    H5P.safariBrowser = H5P.safariBrowser === null ? 0 : parseInt(H5P.safariBrowser[1]);
    if (H5P.safariBrowser === 0 || H5P.safariBrowser > 6) {
        H5P.fullScreenBrowserPrefix = "webkit";
    }
} else if (document.documentElement.mozRequestFullScreen) {
    H5P.fullScreenBrowserPrefix = "moz";
} else if (document.documentElement.msRequestFullscreen) {
    H5P.fullScreenBrowserPrefix = "ms";
}
H5P.opened = {};
H5P.init = function (target) {
    if (H5P.$body === undefined) {
        H5P.$body = H5P.jQuery(document.body);
    }
    if (H5P.fullscreenSupported === undefined) {
        H5P.fullscreenSupported =
            !H5PIntegration.fullscreenDisabled && !H5P.fullscreenDisabled && (!(H5P.isFramed && H5P.externalEmbed !== false) || !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled));
    }
    if (H5P.canHasFullScreen === undefined) {
        H5P.canHasFullScreen = H5P.fullscreenSupported;
    }
    H5P.jQuery(".h5p-content:not(.h5p-initialized)", target).each(function () {
        var $element = H5P.jQuery(this).addClass("h5p-initialized");
        var $container = H5P.jQuery('<div class="h5p-container"></div>').appendTo($element);
        var contentId = $element.data("content-id");
        var contentData = H5PIntegration.contents["cid-" + contentId];
        if (contentData === undefined) {
            return H5P.error("No data for content id " + contentId + ". Perhaps the library is gone?");
        }
        var library = { library: contentData.library, params: JSON.parse(contentData.jsonContent), metadata: contentData.metadata };
        H5P.getUserData(contentId, "state", function (err, previousState) {
            if (previousState) {
                library.userDatas = { state: previousState };
            } else if (previousState === null && H5PIntegration.saveFreq) {
                delete contentData.contentUserData;
                var dialog = new H5P.Dialog(
                    "content-user-data-reset",
                    "Data Reset",
                    "<p>" + H5P.t("contentChanged") + "</p><p>" + H5P.t("startingOver") + '</p><div class="h5p-dialog-ok-button" tabIndex="0" role="button">OK</div>',
                    $container
                );
                H5P.jQuery(dialog)
                    .on("dialog-opened", function (event, $dialog) {
                        var closeDialog = function (event) {
                            if (event.type === "click" || event.which === 32) {
                                dialog.close();
                                H5P.deleteUserData(contentId, "state", 0);
                            }
                        };
                        $dialog.find(".h5p-dialog-ok-button").click(closeDialog).keypress(closeDialog);
                        H5P.trigger(instance, "resize");
                    })
                    .on("dialog-closed", function () {
                        H5P.trigger(instance, "resize");
                    });
                dialog.open();
            }
        });
        var instance = H5P.newRunnable(library, contentId, $container, true, { standalone: true });
        H5P.offlineRequestQueue = new H5P.OfflineRequestQueue({ instance: instance });
        if (contentData.fullScreen == 1 && H5P.fullscreenSupported) {
            H5P.jQuery(
                '<div class="h5p-content-controls">' + '<div role="button" ' + 'tabindex="0" ' + 'class="h5p-enable-fullscreen" ' + 'aria-label="' + H5P.t("fullscreen") + '" ' + 'title="' + H5P.t("fullscreen") + '">' + "</div>" + "</div>"
            )
                .prependTo($container)
                .children()
                .click(function () {
                    H5P.fullScreen($container, instance);
                })
                .keydown(function (e) {
                    if (e.which === 32 || e.which === 13) {
                        H5P.fullScreen($container, instance);
                        return false;
                    }
                });
        }
        var displayOptions = contentData.displayOptions;
        var displayFrame = false;
        if (displayOptions.frame) {
            if (displayOptions.copyright) {
                var copyrights = H5P.getCopyrights(instance, library.params, contentId, library.metadata);
                if (!copyrights) {
                    displayOptions.copyright = false;
                }
            }
            var actionBar = new H5P.ActionBar(displayOptions);
            var $actions = actionBar.getDOMElement();
            actionBar.on("reuse", function () {
                H5P.openReuseDialog($actions, contentData, library, instance, contentId);
                instance.triggerXAPI("accessed-reuse");
            });
            actionBar.on("copyrights", function () {
                var dialog = new H5P.Dialog("copyrights", H5P.t("copyrightInformation"), copyrights, $container);
                dialog.open(true);
                instance.triggerXAPI("accessed-copyright");
            });
            actionBar.on("embed", function () {
                H5P.openEmbedDialog($actions, contentData.embedCode, contentData.resizeCode, { width: $element.width(), height: $element.height() }, instance);
                instance.triggerXAPI("accessed-embed");
            });
            if (actionBar.hasActions()) {
                displayFrame = true;
                $actions.insertAfter($container);
            }
        }
        $element.addClass(displayFrame ? "h5p-frame" : "h5p-no-frame");
        H5P.opened[contentId] = new Date();
        H5P.on(instance, "finish", function (event) {
            if (event.data !== undefined) {
                H5P.setFinished(contentId, event.data.score, event.data.maxScore, event.data.time);
            }
        });
        H5P.on(instance, "xAPI", H5P.xAPICompletedListener);
        if (H5PIntegration.saveFreq !== false && (instance.getCurrentState instanceof Function || typeof instance.getCurrentState === "function")) {
            var saveTimer,
                save = function () {
                    var state = instance.getCurrentState();
                    if (state !== undefined) {
                        H5P.setUserData(contentId, "state", state, { deleteOnChange: true });
                    }
                    if (H5PIntegration.saveFreq) {
                        saveTimer = setTimeout(save, H5PIntegration.saveFreq * 1000);
                    }
                };
            if (H5PIntegration.saveFreq) {
                saveTimer = setTimeout(save, H5PIntegration.saveFreq * 1000);
            }
            H5P.on(instance, "xAPI", function (event) {
                var verb = event.getVerb();
                if (verb === "completed" || verb === "progressed") {
                    clearTimeout(saveTimer);
                    saveTimer = setTimeout(save, 3000);
                }
            });
        }
        if (H5P.isFramed) {
            var resizeDelay;
            if (H5P.externalEmbed === false) {
                var iframe = window.frameElement;
                var resizeIframe = function () {
                    if (window.parent.H5P.isFullscreen) {
                        return;
                    }
                    var parentHeight = iframe.parentElement.style.height;
                    iframe.parentElement.style.height = iframe.parentElement.clientHeight + "px";
                    iframe.getBoundingClientRect();
                    iframe.style.height = "1px";
                    iframe.style.height = iframe.contentDocument.body.scrollHeight + "px";
                    iframe.parentElement.style.height = parentHeight;
                };
                H5P.on(instance, "resize", function () {
                    clearTimeout(resizeDelay);
                    resizeDelay = setTimeout(function () {
                        resizeIframe();
                    }, 1);
                });
            } else if (H5P.communicator) {
                var parentIsFriendly = false;
                H5P.communicator.on("ready", function () {
                    H5P.communicator.send("hello");
                });
                H5P.communicator.on("hello", function () {
                    parentIsFriendly = true;
                    document.body.style.height = "auto";
                    document.body.style.overflow = "hidden";
                    H5P.trigger(instance, "resize");
                });
                H5P.communicator.on("resizePrepared", function () {
                    H5P.communicator.send("resize", { scrollHeight: document.body.scrollHeight });
                });
                H5P.communicator.on("resize", function () {
                    H5P.trigger(instance, "resize");
                });
                H5P.on(instance, "resize", function () {
                    if (H5P.isFullscreen) {
                        return;
                    }
                    clearTimeout(resizeDelay);
                    resizeDelay = setTimeout(function () {
                        if (parentIsFriendly) {
                            H5P.communicator.send("prepareResize", { scrollHeight: document.body.scrollHeight, clientHeight: document.body.clientHeight });
                        } else {
                            H5P.communicator.send("hello");
                        }
                    }, 0);
                });
            }
        }
        if (!H5P.isFramed || H5P.externalEmbed === false) {
            H5P.jQuery(window.parent).resize(function () {
                if (window.parent.H5P.isFullscreen) {
                    H5P.trigger(instance, "resize");
                } else {
                    H5P.trigger(instance, "resize");
                }
            });
        }
        H5P.instances.push(instance);
        H5P.trigger(instance, "resize");
        $element.addClass("using-mouse");
        $element.on("mousedown keydown keyup", function (event) {
            $element.toggleClass("using-mouse", event.type === "mousedown");
        });
        if (H5P.externalDispatcher) {
            H5P.externalDispatcher.trigger("initialized");
        }
    });
    H5P.jQuery("iframe.h5p-iframe:not(.h5p-initialized)", target).each(function () {
        var contentId = H5P.jQuery(this).addClass("h5p-initialized").data("content-id");
        this.contentDocument.open();
        this.contentDocument.write('<!doctype html><html class="h5p-iframe"><head>' + H5P.getHeadTags(contentId) + '</head><body><div class="h5p-content" data-content-id="' + contentId + '"/></body></html>');
        this.contentDocument.close();
    });
};
H5P.getHeadTags = function (contentId) {
    var createStyleTags = function (styles) {
        var tags = "";
        for (var i = 0; i < styles.length; i++) {
            tags += '<link rel="stylesheet" href="' + styles[i] + '">';
        }
        return tags;
    };
    var createScriptTags = function (scripts) {
        var tags = "";
        for (var i = 0; i < scripts.length; i++) {
            tags += '<script src="' + scripts[i] + '"></script>';
        }
        return tags;
    };
    return (
        '<base target="_parent">' +
        createStyleTags(H5PIntegration.core.styles) +
        createStyleTags(H5PIntegration.contents["cid-" + contentId].styles) +
        createScriptTags(H5PIntegration.core.scripts) +
        createScriptTags(H5PIntegration.contents["cid-" + contentId].scripts) +
        "<script>H5PIntegration = window.parent.H5PIntegration; var H5P = H5P || {}; H5P.externalEmbed = false;</script>"
    );
};
H5P.communicator = (function () {
    function Communicator() {
        var self = this;
        var actionHandlers = {};
        window.addEventListener(
            "message",
            function receiveMessage(event) {
                if (window.parent !== event.source || event.data.context !== "h5p") {
                    return;
                }
                if (actionHandlers[event.data.action] !== undefined) {
                    actionHandlers[event.data.action](event.data);
                }
            },
            false
        );
        self.on = function (action, handler) {
            actionHandlers[action] = handler;
        };
        self.send = function (action, data) {
            if (data === undefined) {
                data = {};
            }
            data.context = "h5p";
            data.action = action;
            window.parent.postMessage(data, "*");
        };
    }
    return window.postMessage && window.addEventListener ? new Communicator() : undefined;
})();
H5P.semiFullScreen = function ($element, instance, exitCallback, body) {
    H5P.fullScreen($element, instance, exitCallback, body, true);
};
H5P.fullScreen = function ($element, instance, exitCallback, body, forceSemiFullScreen) {
    if (H5P.exitFullScreen !== undefined) {
        return;
    }
    if (H5P.isFramed && H5P.externalEmbed === false) {
        window.parent.H5P.fullScreen($element, instance, exitCallback, H5P.$body.get(), forceSemiFullScreen);
        H5P.isFullscreen = true;
        H5P.exitFullScreen = function () {
            window.parent.H5P.exitFullScreen();
        };
        H5P.on(instance, "exitFullScreen", function () {
            H5P.isFullscreen = false;
            H5P.exitFullScreen = undefined;
        });
        return;
    }
    var $container = $element;
    var $classes, $iframe, $body;
    if (body === undefined) {
        $body = H5P.$body;
    } else {
        $body = H5P.jQuery(body);
        $classes = $body.add($element.get());
        var iframeSelector = "#h5p-iframe-" + $element.parent().data("content-id");
        $iframe = H5P.jQuery(iframeSelector);
        $element = $iframe.parent();
    }
    $classes = $element.add(H5P.$body).add($classes);
    var before = function (classes) {
        $classes.addClass(classes);
        if ($iframe !== undefined) {
            $iframe.css("height", "");
        }
    };
    var entered = function () {
        H5P.trigger(instance, "resize");
        H5P.trigger(instance, "focus");
        H5P.trigger(instance, "enterFullScreen");
    };
    var done = function (classes) {
        H5P.isFullscreen = false;
        $classes.removeClass(classes);
        H5P.trigger(instance, "resize");
        H5P.trigger(instance, "focus");
        H5P.exitFullScreen = undefined;
        if (exitCallback !== undefined) {
            exitCallback();
        }
        H5P.trigger(instance, "exitFullScreen");
    };
    H5P.isFullscreen = true;
    if (H5P.fullScreenBrowserPrefix === undefined || forceSemiFullScreen === true) {
        if (H5P.isFramed) {
            return;
        }
        before("h5p-semi-fullscreen");
        var $disable = H5P.jQuery('<div role="button" tabindex="0" class="h5p-disable-fullscreen" title="' + H5P.t("disableFullscreen") + '" aria-label="' + H5P.t("disableFullscreen") + '"></div>').appendTo(
            $container.find(".h5p-content-controls")
        );
        var keyup,
            disableSemiFullscreen = (H5P.exitFullScreen = function () {
                if (prevViewportContent) {
                    h5pViewport.content = prevViewportContent;
                } else {
                    head.removeChild(h5pViewport);
                }
                $disable.remove();
                $body.unbind("keyup", keyup);
                done("h5p-semi-fullscreen");
            });
        keyup = function (event) {
            if (event.keyCode === 27) {
                disableSemiFullscreen();
            }
        };
        $disable.click(disableSemiFullscreen);
        $body.keyup(keyup);
        var prevViewportContent, h5pViewport;
        var metaTags = document.getElementsByTagName("meta");
        for (var i = 0; i < metaTags.length; i++) {
            if (metaTags[i].name === "viewport") {
                h5pViewport = metaTags[i];
                prevViewportContent = h5pViewport.content;
                break;
            }
        }
        if (!prevViewportContent) {
            h5pViewport = document.createElement("meta");
            h5pViewport.name = "viewport";
        }
        h5pViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
        if (!prevViewportContent) {
            var head = document.getElementsByTagName("head")[0];
            head.appendChild(h5pViewport);
        }
        entered();
    } else {
        before("h5p-fullscreen");
        var first,
            eventName = H5P.fullScreenBrowserPrefix === "ms" ? "MSFullscreenChange" : H5P.fullScreenBrowserPrefix + "fullscreenchange";
        document.addEventListener(eventName, function () {
            if (first === undefined) {
                first = false;
                entered();
                return;
            }
            done("h5p-fullscreen");
            document.removeEventListener(eventName, arguments.callee, false);
        });
        if (H5P.fullScreenBrowserPrefix === "") {
            $element[0].requestFullScreen();
        } else {
            var method = H5P.fullScreenBrowserPrefix === "ms" ? "msRequestFullscreen" : H5P.fullScreenBrowserPrefix + "RequestFullScreen";
            var params = H5P.fullScreenBrowserPrefix === "webkit" && H5P.safariBrowser === 0 ? Element.ALLOW_KEYBOARD_INPUT : undefined;
            $element[0][method](params);
        }
        H5P.exitFullScreen = function () {
            if (H5P.fullScreenBrowserPrefix === "") {
                document.exitFullscreen();
            } else if (H5P.fullScreenBrowserPrefix === "moz") {
                document.mozCancelFullScreen();
            } else {
                document[H5P.fullScreenBrowserPrefix + "ExitFullscreen"]();
            }
        };
    }
};
(function () {
    H5P.addQueryParameter = function (path, parameter) {
        let newPath, secondSplit;
        const firstSplit = path.split("?");
        if (firstSplit[1]) {
            secondSplit = firstSplit[1].split("#");
            newPath = firstSplit[0] + "?" + secondSplit[0] + "&";
        } else {
            secondSplit = firstSplit[0].split("#");
            newPath = secondSplit[0] + "?";
        }
        newPath += parameter;
        if (secondSplit[1]) {
            newPath += "#" + secondSplit[1];
        }
        return newPath;
    };
    H5P.setSource = function (element, source, contentId) {
        let path = source.path;
        const crossOrigin = H5P.getCrossOrigin(source);
        if (crossOrigin) {
            element.crossOrigin = crossOrigin;
            if (H5PIntegration.crossoriginCacheBuster) {
                path = H5P.addQueryParameter(path, H5PIntegration.crossoriginCacheBuster);
            }
        } else {
            element.removeAttribute("crossorigin");
        }
        element.src = H5P.getPath(path, contentId);
    };
    var hasProtocol = function (path) {
        return path.match(/^[a-z0-9]+:\/\//i);
    };
    H5P.getCrossOrigin = function (source) {
        if (typeof source !== "object") {
            return H5PIntegration.crossorigin && H5PIntegration.crossoriginRegex && source.match(H5PIntegration.crossoriginRegex) ? H5PIntegration.crossorigin : null;
        }
        if (H5PIntegration.crossorigin && !hasProtocol(source.path)) {
            return H5PIntegration.crossorigin;
        }
    };
    H5P.getPath = function (path, contentId) {
        if (hasProtocol(path)) {
            return path;
        }
        var prefix;
        var isTmpFile = path.substr(-4, 4) === "#tmp";
        if (contentId !== undefined && !isTmpFile) {
            if (H5PIntegration.contents !== undefined && H5PIntegration.contents["cid-" + contentId]) {
                prefix = H5PIntegration.contents["cid-" + contentId].contentUrl;
            }
            if (!prefix) {
               // prefix = H5PIntegration.url + "/library/";
               prefix = document.URL.substr(0,document.URL.lastIndexOf('/')) + "/library/";
            }
        } else if (window.H5PEditor !== undefined) {
            prefix = H5PEditor.filesPath;
        } else {
            return;
        }
        if (!hasProtocol(prefix)) {
            prefix = window.location.protocol + "//" + window.location.host + prefix;
        }
        console.log(prefix,path);
        return prefix + "/" + path;
    };
})();
H5P.getContentPath = function (contentId) {
    return H5PIntegration.url + "/content/" + contentId;
};
H5P.classFromName = function (name) {
    var arr = name.split(".");
    return this[arr[arr.length - 1]];
};
H5P.newRunnable = function (library, contentId, $attachTo, skipResize, extras) {
    var nameSplit, versionSplit, machineName;
    try {
        nameSplit = library.library.split(" ", 2);
        machineName = nameSplit[0];
        versionSplit = nameSplit[1].split(".", 2);
    } catch (err) {
        return H5P.error("Invalid library string: " + library.library);
    }
    if (library.params instanceof Object !== true || library.params instanceof Array === true) {
        H5P.error("Invalid library params for: " + library.library);
        return H5P.error(library.params);
    }
    var constructor;
    try {
        nameSplit = nameSplit[0].split(".");
        constructor = window;
        for (var i = 0; i < nameSplit.length; i++) {
            constructor = constructor[nameSplit[i]];
        }
        if (typeof constructor !== "function") {
            throw null;
        }
    } catch (err) {
        return H5P.error("Unable to find constructor for: " + library.library);
    }
    if (extras === undefined) {
        extras = {};
    }
    if (library.subContentId) {
        extras.subContentId = library.subContentId;
    }
    if (library.userDatas && library.userDatas.state && H5PIntegration.saveFreq) {
        extras.previousState = library.userDatas.state;
    }
    if (library.metadata) {
        extras.metadata = library.metadata;
    }
    var standalone = extras.standalone || false;
    constructor.prototype = H5P.jQuery.extend({}, H5P.ContentType(standalone).prototype, constructor.prototype);
    var instance;
    if (H5P.jQuery.inArray(library.library, ["H5P.CoursePresentation 1.0", "H5P.CoursePresentation 1.1", "H5P.CoursePresentation 1.2", "H5P.CoursePresentation 1.3"]) > -1) {
        instance = new constructor(library.params, contentId);
    } else {
        instance = new constructor(library.params, contentId, extras);
    }
    if (instance.$ === undefined) {
        instance.$ = H5P.jQuery(instance);
    }
    if (instance.contentId === undefined) {
        instance.contentId = contentId;
    }
    if (instance.subContentId === undefined && library.subContentId) {
        instance.subContentId = library.subContentId;
    }
    if (instance.parent === undefined && extras && extras.parent) {
        instance.parent = extras.parent;
    }
    if (instance.libraryInfo === undefined) {
        instance.libraryInfo = { versionedName: library.library, versionedNameNoSpaces: machineName + "-" + versionSplit[0] + "." + versionSplit[1], machineName: machineName, majorVersion: versionSplit[0], minorVersion: versionSplit[1] };
    }
    if ($attachTo !== undefined) {
        $attachTo.toggleClass("h5p-standalone", standalone);
        instance.attach($attachTo);
        H5P.trigger(instance, "domChanged", { $target: $attachTo, library: machineName, key: "newLibrary" }, { bubbles: true, external: true });
        if (skipResize === undefined || !skipResize) {
            H5P.trigger(instance, "resize");
        }
    }
    return instance;
};
H5P.error = function (err) {
    if (window.console !== undefined && console.error !== undefined) {
        console.error(err.stack ? err.stack : err);
    }
};
H5P.t = function (key, vars, ns) {
    if (ns === undefined) {
        ns = "H5P";
    }
    if (H5PIntegration.l10n[ns] === undefined) {
        return '[Missing translation namespace "' + ns + '"]';
    }
    if (H5PIntegration.l10n[ns][key] === undefined) {
        return '[Missing translation "' + key + '" in "' + ns + '"]';
    }
    var translation = H5PIntegration.l10n[ns][key];
    if (vars !== undefined) {
        for (var placeholder in vars) {
            translation = translation.replace(placeholder, vars[placeholder]);
        }
    }
    return translation;
};
H5P.Dialog = function (name, title, content, $element) {
    var self = this;
    var $dialog = H5P.jQuery(
        '<div class="h5p-popup-dialog h5p-' +
            name +
            '-dialog" role="dialog" tabindex="-1">\
                              <div class="h5p-inner">\
                                <h2>' +
            title +
            '</h2>\
                                <div class="h5p-scroll-content">' +
            content +
            '</div>\
                                <div class="h5p-close" role="button" tabindex="0" aria-label="' +
            H5P.t("close") +
            '" title="' +
            H5P.t("close") +
            '"></div>\
                              </div>\
                            </div>'
    )
        .insertAfter($element)
        .click(function (e) {
            if (e && e.originalEvent && e.originalEvent.preventClosing) {
                return;
            }
            self.close();
        })
        .children(".h5p-inner")
        .click(function (e) {
            e.originalEvent.preventClosing = true;
        })
        .find(".h5p-close")
        .click(function () {
            self.close();
        })
        .keypress(function (e) {
            if (e.which === 13 || e.which === 32) {
                self.close();
                return false;
            }
        })
        .end()
        .find("a")
        .click(function (e) {
            e.stopPropagation();
        })
        .end()
        .end();
    self.open = function (scrollbar) {
        if (scrollbar) {
            $dialog.css("height", "100%");
        }
        setTimeout(function () {
            $dialog.addClass("h5p-open");
            H5P.jQuery(self).trigger("dialog-opened", [$dialog]);
            $dialog.focus();
        }, 1);
    };
    self.close = function () {
        $dialog.removeClass("h5p-open");
        setTimeout(function () {
            $dialog.remove();
            H5P.jQuery(self).trigger("dialog-closed", [$dialog]);
            $element.attr("tabindex", "-1");
            $element.focus();
        }, 200);
    };
};
H5P.getCopyrights = function (instance, parameters, contentId, metadata) {
    var copyrights;
    if (instance.getCopyrights !== undefined) {
        try {
            copyrights = instance.getCopyrights();
        } catch (err) {}
    }
    if (copyrights === undefined) {
        copyrights = new H5P.ContentCopyrights();
        H5P.findCopyrights(copyrights, parameters, contentId);
    }
    var metadataCopyrights = H5P.buildMetadataCopyrights(metadata, instance.libraryInfo.machineName);
    if (metadataCopyrights !== undefined) {
        copyrights.addMediaInFront(metadataCopyrights);
    }
    if (copyrights !== undefined) {
        copyrights = copyrights.toString();
    }
    return copyrights;
};
H5P.findCopyrights = function (info, parameters, contentId, extras) {
    if (extras) {
        extras.params = parameters;
        buildFromMetadata(extras, extras.machineName, contentId);
    }
    var lastContentTypeName;
    for (var field in parameters) {
        if (!parameters.hasOwnProperty(field)) {
            continue;
        }
        if (field === "overrideSettings") {
            console.warn("The semantics field 'overrideSettings' is DEPRECATED and should not be used.");
            console.warn(parameters);
            continue;
        }
        var value = parameters[field];
        if (value && value.library && typeof value.library === "string") {
            lastContentTypeName = value.library.split(" ")[0];
        } else if (value && value.library && typeof value.library === "object") {
            lastContentTypeName = value.library.library && typeof value.library.library === "string" ? value.library.library.split(" ")[0] : lastContentTypeName;
        }
        if (value instanceof Array) {
            H5P.findCopyrights(info, value, contentId);
        } else if (value instanceof Object) {
            buildFromMetadata(value, lastContentTypeName, contentId);
            if (value.copyright === undefined || value.copyright.license === undefined || value.path === undefined || value.mime === undefined) {
                H5P.findCopyrights(info, value, contentId);
            } else {
                var copyrights = new H5P.MediaCopyright(value.copyright);
                if (value.width !== undefined && value.height !== undefined) {
                    copyrights.setThumbnail(new H5P.Thumbnail(H5P.getPath(value.path, contentId), value.width, value.height));
                }
                info.addMedia(copyrights);
            }
        }
    }
    function buildFromMetadata(data, name, contentId) {
        if (data.metadata) {
            const metadataCopyrights = H5P.buildMetadataCopyrights(data.metadata, name);
            if (metadataCopyrights !== undefined) {
                if (data.params && data.params.contentName === "Image" && data.params.file) {
                    const path = data.params.file.path;
                    const width = data.params.file.width;
                    const height = data.params.file.height;
                    metadataCopyrights.setThumbnail(new H5P.Thumbnail(H5P.getPath(path, contentId), width, height));
                }
                info.addMedia(metadataCopyrights);
            }
        }
    }
};
H5P.buildMetadataCopyrights = function (metadata) {
    if (metadata && metadata.license !== undefined && metadata.license !== "U") {
        var dataset = {
            contentType: metadata.contentType,
            title: metadata.title,
            author:
                metadata.authors && metadata.authors.length > 0
                    ? metadata.authors
                          .map(function (author) {
                              return author.role ? author.name + " (" + author.role + ")" : author.name;
                          })
                          .join(", ")
                    : undefined,
            source: metadata.source,
            year: metadata.yearFrom ? metadata.yearFrom + (metadata.yearTo ? "-" + metadata.yearTo : "") : undefined,
            license: metadata.license,
            version: metadata.licenseVersion,
            licenseExtras: metadata.licenseExtras,
            changes:
                metadata.changes && metadata.changes.length > 0
                    ? metadata.changes
                          .map(function (change) {
                              return change.log + (change.author ? ", " + change.author : "") + (change.date ? ", " + change.date : "");
                          })
                          .join(" / ")
                    : undefined,
        };
        return new H5P.MediaCopyright(dataset);
    }
};
H5P.openReuseDialog = function ($element, contentData, library, instance, contentId) {
    let html = "";
    if (contentData.displayOptions.export) {
        html +=
            '<button type="button" class="h5p-big-button h5p-download-button"><div class="h5p-button-title">Download as an .h5p file</div><div class="h5p-button-description">.h5p files may be uploaded to any web-site where H5P content may be created.</div></button>';
    }
    if (contentData.displayOptions.export && contentData.displayOptions.copy) {
        html += '<div class="h5p-horizontal-line-text"><span>or</span></div>';
    }
    if (contentData.displayOptions.copy) {
        html +=
            '<button type="button" class="h5p-big-button h5p-copy-button"><div class="h5p-button-title">Copy content</div><div class="h5p-button-description">Copied content may be pasted anywhere this content type is supported on this website.</div></button>';
    }
    const dialog = new H5P.Dialog("reuse", H5P.t("reuseContent"), html, $element);
    H5P.jQuery(dialog)
        .on("dialog-opened", function (e, $dialog) {
            H5P.jQuery('<a href="https://h5p.org/node/442225" target="_blank">More Info</a>')
                .click(function (e) {
                    e.stopPropagation();
                })
                .appendTo($dialog.find("h2"));
            $dialog.find(".h5p-download-button").click(function () {
                window.location.href = contentData.exportUrl;
                instance.triggerXAPI("downloaded");
                dialog.close();
            });
            $dialog.find(".h5p-copy-button").click(function () {
                const item = new H5P.ClipboardItem(library);
                item.contentId = contentId;
                H5P.setClipboard(item);
                instance.triggerXAPI("copied");
                dialog.close();
                H5P.attachToastTo(H5P.jQuery(".h5p-content:first")[0], H5P.t("contentCopied"), { position: { horizontal: "centered", vertical: "centered", noOverflowX: true } });
            });
            H5P.trigger(instance, "resize");
        })
        .on("dialog-closed", function () {
            H5P.trigger(instance, "resize");
        });
    dialog.open();
};
H5P.openEmbedDialog = function ($element, embedCode, resizeCode, size, instance) {
    var fullEmbedCode = embedCode + resizeCode;
    var dialog = new H5P.Dialog(
        "embed",
        H5P.t("embed"),
        '<textarea class="h5p-embed-code-container" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>' +
            H5P.t("size") +
            ': <input type="text" value="' +
            Math.ceil(size.width) +
            '" class="h5p-embed-size"/> × <input type="text" value="' +
            Math.ceil(size.height) +
            '" class="h5p-embed-size"/> px<br/><div role="button" tabindex="0" class="h5p-expander">' +
            H5P.t("showAdvanced") +
            '</div><div class="h5p-expander-content"><p>' +
            H5P.t("advancedHelp") +
            '</p><textarea class="h5p-embed-code-container" autocorrect="off" autocapitalize="off" spellcheck="false">' +
            resizeCode +
            "</textarea></div>",
        $element
    );
    H5P.jQuery(dialog)
        .on("dialog-opened", function (event, $dialog) {
            var $inner = $dialog.find(".h5p-inner");
            var $scroll = $inner.find(".h5p-scroll-content");
            var diff = $scroll.outerHeight() - $scroll.innerHeight();
            var positionInner = function () {
                H5P.trigger(instance, "resize");
            };
            var $w = $dialog.find(".h5p-embed-size:eq(0)");
            var $h = $dialog.find(".h5p-embed-size:eq(1)");
            var getNum = function ($e, d) {
                var num = parseFloat($e.val());
                if (isNaN(num)) {
                    return d;
                }
                return Math.ceil(num);
            };
            var updateEmbed = function () {
                $dialog.find(".h5p-embed-code-container:first").val(fullEmbedCode.replace(":w", getNum($w, size.width)).replace(":h", getNum($h, size.height)));
            };
            $w.change(updateEmbed);
            $h.change(updateEmbed);
            updateEmbed();
            $dialog.find(".h5p-embed-code-container").each(function () {
                H5P.jQuery(this)
                    .css("height", this.scrollHeight + "px")
                    .focus(function () {
                        H5P.jQuery(this).select();
                    });
            });
            $dialog.find(".h5p-embed-code-container").eq(0).select();
            positionInner();
            var expand = function () {
                var $expander = H5P.jQuery(this);
                var $content = $expander.next();
                if ($content.is(":visible")) {
                    $expander.removeClass("h5p-open").text(H5P.t("showAdvanced")).attr("aria-expanded", "true");
                    $content.hide();
                } else {
                    $expander.addClass("h5p-open").text(H5P.t("hideAdvanced")).attr("aria-expanded", "false");
                    $content.show();
                }
                $dialog.find(".h5p-embed-code-container").each(function () {
                    H5P.jQuery(this).css("height", this.scrollHeight + "px");
                });
                positionInner();
            };
            $dialog
                .find(".h5p-expander")
                .click(expand)
                .keypress(function (event) {
                    if (event.keyCode === 32) {
                        expand.apply(this);
                        return false;
                    }
                });
        })
        .on("dialog-closed", function () {
            H5P.trigger(instance, "resize");
        });
    dialog.open();
};
H5P.attachToastTo = function (element, message, config) {
    if (element === undefined || message === undefined) {
        return;
    }
    const eventPath = function (evt) {
        var path = (evt.composedPath && evt.composedPath()) || evt.path;
        var target = evt.target;
        if (path != null) {
            return path.indexOf(window) < 0 ? path.concat(window) : path;
        }
        if (target === window) {
            return [window];
        }
        function getParents(node, memo) {
            memo = memo || [];
            var parentNode = node.parentNode;
            if (!parentNode) {
                return memo;
            } else {
                return getParents(parentNode, memo.concat(parentNode));
            }
        }
        return [target].concat(getParents(target), window);
    };
    const clickHandler = function (event) {
        var path = eventPath(event);
        if (path.indexOf(element) !== -1) {
            return;
        }
        clearTimeout(timer);
        removeToast();
    };
    const removeToast = function () {
        document.removeEventListener("click", clickHandler);
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    };
    const getToastCoordinates = function (element, toast, position) {
        position = position || {};
        position.offsetHorizontal = position.offsetHorizontal || 0;
        position.offsetVertical = position.offsetVertical || 0;
        const toastRect = toast.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        let left = 0;
        let top = 0;
        switch (position.horizontal) {
            case "before":
                left = elementRect.left - toastRect.width - position.offsetHorizontal;
                break;
            case "after":
                left = elementRect.left + elementRect.width + position.offsetHorizontal;
                break;
            case "left":
                left = elementRect.left + position.offsetHorizontal;
                break;
            case "right":
                left = elementRect.left + elementRect.width - toastRect.width - position.offsetHorizontal;
                break;
            case "centered":
                left = elementRect.left + elementRect.width / 2 - toastRect.width / 2 + position.offsetHorizontal;
                break;
            default:
                left = elementRect.left + elementRect.width / 2 - toastRect.width / 2 + position.offsetHorizontal;
        }
        switch (position.vertical) {
            case "above":
                top = elementRect.top - toastRect.height - position.offsetVertical;
                break;
            case "below":
                top = elementRect.top + elementRect.height + position.offsetVertical;
                break;
            case "top":
                top = elementRect.top + position.offsetVertical;
                break;
            case "bottom":
                top = elementRect.top + elementRect.height - toastRect.height - position.offsetVertical;
                break;
            case "centered":
                top = elementRect.top + elementRect.height / 2 - toastRect.height / 2 + position.offsetVertical;
                break;
            default:
                top = elementRect.top + elementRect.height + position.offsetVertical;
        }
        const overflowElement = document.body;
        const bounds = overflowElement.getBoundingClientRect();
        if ((position.noOverflowLeft || position.noOverflowX) && left < bounds.x) {
            left = bounds.x;
        }
        if ((position.noOverflowRight || position.noOverflowX) && left + toastRect.width > bounds.x + bounds.width) {
            left = bounds.x + bounds.width - toastRect.width;
        }
        if ((position.noOverflowTop || position.noOverflowY) && top < bounds.y) {
            top = bounds.y;
        }
        if ((position.noOverflowBottom || position.noOverflowY) && top + toastRect.height > bounds.y + bounds.height) {
            left = bounds.y + bounds.height - toastRect.height;
        }
        return { left: left, top: top };
    };
    config = config || {};
    config.style = config.style || "h5p-toast";
    config.duration = config.duration || 3000;
    const toast = document.createElement("div");
    toast.setAttribute("id", config.style);
    toast.classList.add("h5p-toast-disabled");
    toast.classList.add(config.style);
    const msg = document.createElement("span");
    msg.innerHTML = message;
    toast.appendChild(msg);
    document.body.appendChild(toast);
    const coordinates = getToastCoordinates(element, toast, config.position);
    toast.style.left = Math.round(coordinates.left) + "px";
    toast.style.top = Math.round(coordinates.top) + "px";
    toast.classList.remove("h5p-toast-disabled");
    const timer = setTimeout(removeToast, config.duration);
    document.addEventListener("click", clickHandler);
};
H5P.ContentCopyrights = function () {
    var label;
    var media = [];
    var content = [];
    this.setLabel = function (newLabel) {
        label = newLabel;
    };
    this.addMedia = function (newMedia) {
        if (newMedia !== undefined) {
            media.push(newMedia);
        }
    };
    this.addMediaInFront = function (newMedia) {
        if (newMedia !== undefined) {
            media.unshift(newMedia);
        }
    };
    this.addContent = function (newContent) {
        if (newContent !== undefined) {
            content.push(newContent);
        }
    };
    this.toString = function () {
        var html = "";
        for (var i = 0; i < media.length; i++) {
            html += media[i];
        }
        for (i = 0; i < content.length; i++) {
            html += content[i];
        }
        if (html !== "") {
            if (label !== undefined) {
                html = "<h3>" + label + "</h3>" + html;
            }
            html = '<div class="h5p-content-copyrights">' + html + "</div>";
        }
        return html;
    };
};
H5P.MediaCopyright = function (copyright, labels, order, extraFields) {
    var thumbnail;
    var list = new H5P.DefinitionList();
    var getLabel = function (fieldName) {
        if (labels === undefined || labels[fieldName] === undefined) {
            return H5P.t(fieldName);
        }
        return labels[fieldName];
    };
    var humanizeLicense = function (license, version) {
        var copyrightLicense = H5P.copyrightLicenses[license];
        var value = "";
        if (!(license === "PD" && version)) {
            value += copyrightLicense.hasOwnProperty("label") ? copyrightLicense.label : copyrightLicense;
        }
        var versionInfo;
        if (copyrightLicense.versions) {
            if (copyrightLicense.versions.default && (!version || !copyrightLicense.versions[version])) {
                version = copyrightLicense.versions.default;
            }
            if (version && copyrightLicense.versions[version]) {
                versionInfo = copyrightLicense.versions[version];
            }
        }
        if (versionInfo) {
            if (value) {
                value += " ";
            }
            value += versionInfo.hasOwnProperty("label") ? versionInfo.label : versionInfo;
        }
        var link;
        if (copyrightLicense.hasOwnProperty("link")) {
            link = copyrightLicense.link.replace(":version", copyrightLicense.linkVersions ? copyrightLicense.linkVersions[version] : version);
        } else if (versionInfo && copyrightLicense.hasOwnProperty("link")) {
            link = versionInfo.link;
        }
        if (link) {
            value = '<a href="' + link + '" target="_blank">' + value + "</a>";
        }
        var parenthesis = "";
        if (license !== "PD" && license !== "C") {
            parenthesis += license;
        }
        if (version && version !== "CC0 1.0") {
            if (parenthesis && license !== "GNU GPL") {
                parenthesis += " ";
            }
            parenthesis += version;
        }
        if (parenthesis) {
            value += " (" + parenthesis + ")";
        }
        if (license === "C") {
            value += " &copy;";
        }
        return value;
    };
    if (copyright !== undefined) {
        for (var field in extraFields) {
            if (extraFields.hasOwnProperty(field)) {
                copyright[field] = extraFields[field];
            }
        }
        if (order === undefined) {
            order = ["contentType", "title", "license", "author", "year", "source", "licenseExtras", "changes"];
        }
        for (var i = 0; i < order.length; i++) {
            var fieldName = order[i];
            if (copyright[fieldName] !== undefined && copyright[fieldName] !== "") {
                var humanValue = copyright[fieldName];
                if (fieldName === "license") {
                    humanValue = humanizeLicense(copyright.license, copyright.version);
                }
                if (fieldName === "source") {
                    humanValue = humanValue ? '<a href="' + humanValue + '" target="_blank">' + humanValue + "</a>" : undefined;
                }
                list.add(new H5P.Field(getLabel(fieldName), humanValue));
            }
        }
    }
    this.setThumbnail = function (newThumbnail) {
        thumbnail = newThumbnail;
    };
    this.undisclosed = function () {
        if (list.size() === 1) {
            var field = list.get(0);
            if (field.getLabel() === getLabel("license") && field.getValue() === humanizeLicense("U")) {
                return true;
            }
        }
        return false;
    };
    this.toString = function () {
        var html = "";
        if (this.undisclosed()) {
            return html;
        }
        if (thumbnail !== undefined) {
            html += thumbnail;
        }
        html += list;
        if (html !== "") {
            html = '<div class="h5p-media-copyright">' + html + "</div>";
        }
        return html;
    };
};
H5P.Thumbnail = function (source, width, height) {
    var thumbWidth,
        thumbHeight = 100;
    if (width !== undefined) {
        thumbWidth = Math.round(thumbHeight * (width / height));
    }
    this.toString = function () {
        return '<img src="' + source + '" alt="' + H5P.t("thumbnail") + '" class="h5p-thumbnail" height="' + thumbHeight + '"' + (thumbWidth === undefined ? "" : ' width="' + thumbWidth + '"') + "/>";
    };
};
H5P.Field = function (label, value) {
    this.getLabel = function () {
        return label;
    };
    this.getValue = function () {
        return value;
    };
};
H5P.DefinitionList = function () {
    var fields = [];
    this.add = function (field) {
        fields.push(field);
    };
    this.size = function () {
        return fields.length;
    };
    this.get = function (index) {
        return fields[index];
    };
    this.toString = function () {
        var html = "";
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            html += "<dt>" + field.getLabel() + "</dt><dd>" + field.getValue() + "</dd>";
        }
        return html === "" ? html : '<dl class="h5p-definition-list">' + html + "</dl>";
    };
};
H5P.Coords = function (x, y, w, h) {
    if (!(this instanceof H5P.Coords)) return new H5P.Coords(x, y, w, h);
    this.x = 0;
    this.y = 0;
    this.w = 1;
    this.h = 1;
    if (typeof x === "object") {
        this.x = x.x;
        this.y = x.y;
        this.w = x.w;
        this.h = x.h;
    } else {
        if (x !== undefined) {
            this.x = x;
        }
        if (y !== undefined) {
            this.y = y;
        }
        if (w !== undefined) {
            this.w = w;
        }
        if (h !== undefined) {
            this.h = h;
        }
    }
    return this;
};
H5P.libraryFromString = function (library) {
    var regExp = /(.+)\s(\d+)\.(\d+)$/g;
    var res = regExp.exec(library);
    if (res !== null) {
        return { machineName: res[1], majorVersion: parseInt(res[2]), minorVersion: parseInt(res[3]) };
    } else {
        return false;
    }
};
H5P.getLibraryPath = function (library) {
    if (H5PIntegration.urlLibraries !== undefined) {
        return H5PIntegration.urlLibraries + "/" + library;
    } else {
        return H5PIntegration.url + "/libraries/" + library;
    }
};
H5P.cloneObject = function (object, recursive) {
    var clone = object instanceof Array ? [] : {};
    for (var i in object) {
        if (object.hasOwnProperty(i)) {
            if (recursive !== undefined && recursive && typeof object[i] === "object") {
                clone[i] = H5P.cloneObject(object[i], recursive);
            } else {
                clone[i] = object[i];
            }
        }
    }
    return clone;
};
H5P.trim = function (value) {
    return value.replace(/^\s+|\s+$/g, "");
};
H5P.jsLoaded = function (path) {
    H5PIntegration.loadedJs = H5PIntegration.loadedJs || [];
    return H5P.jQuery.inArray(path, H5PIntegration.loadedJs) !== -1;
};
H5P.cssLoaded = function (path) {
    H5PIntegration.loadedCss = H5PIntegration.loadedCss || [];
    return H5P.jQuery.inArray(path, H5PIntegration.loadedCss) !== -1;
};
H5P.shuffleArray = function (array) {
    if (!(array instanceof Array)) {
        return;
    }
    var i = array.length,
        j,
        tempi,
        tempj;
    if (i === 0) return false;
    while (--i) {
        j = Math.floor(Math.random() * (i + 1));
        tempi = array[i];
        tempj = array[j];
        array[i] = tempj;
        array[j] = tempi;
    }
    return array;
};
H5P.setFinished = function (contentId, score, maxScore, time) {
    var validScore = typeof score === "number" || score instanceof Number;
    if (validScore && H5PIntegration.postUserStatistics === true) {
        var toUnix = function (date) {
            return Math.round(date.getTime() / 1000);
        };
        const data = { contentId: contentId, score: score, maxScore: maxScore, opened: toUnix(H5P.opened[contentId]), finished: toUnix(new Date()), time: time };
        H5P.jQuery.post(H5PIntegration.ajax.setFinished, data).fail(function () {
            H5P.offlineRequestQueue.add(H5PIntegration.ajax.setFinished, data);
        });
    }
};
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (needle) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === needle) {
                return i;
            }
        }
        return -1;
    };
}
if (String.prototype.trim === undefined) {
    String.prototype.trim = function () {
        return H5P.trim(this);
    };
}
H5P.trigger = function (instance, eventType, data, extras) {
    if (instance.trigger !== undefined) {
        instance.trigger(eventType, data, extras);
    } else if (instance.$ !== undefined && instance.$.trigger !== undefined) {
        instance.$.trigger(eventType);
    }
};
H5P.on = function (instance, eventType, handler) {
    if (instance.on !== undefined) {
        instance.on(eventType, handler);
    } else if (instance.$ !== undefined && instance.$.on !== undefined) {
        instance.$.on(eventType, handler);
    }
};
H5P.createUUID = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
        var random = (Math.random() * 16) | 0,
            newChar = char === "x" ? random : (random & 0x3) | 0x8;
        return newChar.toString(16);
    });
};
H5P.createTitle = function (rawTitle, maxLength) {
    if (!rawTitle) {
        return "";
    }
    if (maxLength === undefined) {
        maxLength = 60;
    }
    var title = H5P.jQuery("<div></div>")
        .text(rawTitle.replace(/(<([^>]+)>)/gi, ""))
        .text();
    if (title.length > maxLength) {
        title = title.substr(0, maxLength - 3) + "...";
    }
    return title;
};
(function ($) {
    function contentUserDataAjax(contentId, dataType, subContentId, done, data, preload, invalidate, async) {
        if (H5PIntegration.user === undefined) {
            done("Not signed in.");
            return;
        }
        var options = {
            url: H5PIntegration.ajax.contentUserData
                .replace(":contentId", contentId)
                .replace(":dataType", dataType)
                .replace(":subContentId", subContentId ? subContentId : 0),
            dataType: "json",
            async: async === undefined ? true : async,
        };
        if (data !== undefined) {
            options.type = "POST";
            options.data = { data: data === null ? 0 : data, preload: preload ? 1 : 0, invalidate: invalidate ? 1 : 0 };
        } else {
            options.type = "GET";
        }
        if (done !== undefined) {
            options.error = function (xhr, error) {
                done(error);
            };
            options.success = function (response) {
                if (!response.success) {
                    done(response.message);
                    return;
                }
                if (response.data === false || response.data === undefined) {
                    done();
                    return;
                }
                done(undefined, response.data);
            };
        }
        $.ajax(options);
    }
    H5P.getUserData = function (contentId, dataId, done, subContentId) {
        if (!subContentId) {
            subContentId = 0;
        }
        H5PIntegration.contents = H5PIntegration.contents || {};
        var content = H5PIntegration.contents["cid-" + contentId] || {};
        var preloadedData = content.contentUserData;
        if (preloadedData && preloadedData[subContentId] && preloadedData[subContentId][dataId] !== undefined) {
            if (preloadedData[subContentId][dataId] === "RESET") {
                done(undefined, null);
                return;
            }
            try {
                done(undefined, JSON.parse(preloadedData[subContentId][dataId]));
            } catch (err) {
                done(err);
            }
        } else {
            contentUserDataAjax(contentId, dataId, subContentId, function (err, data) {
                if (err || data === undefined) {
                    done(err, data);
                    return;
                }
                if (content.contentUserData === undefined) {
                    content.contentUserData = preloadedData = {};
                }
                if (preloadedData[subContentId] === undefined) {
                    preloadedData[subContentId] = {};
                }
                preloadedData[subContentId][dataId] = data;
                try {
                    done(undefined, JSON.parse(data));
                } catch (e) {
                    done(e);
                }
            });
        }
    };
    H5P.setUserData = function (contentId, dataId, data, extras) {
        var options = H5P.jQuery.extend(true, {}, { subContentId: 0, preloaded: true, deleteOnChange: false, async: true }, extras);
        try {
            data = JSON.stringify(data);
        } catch (err) {
            if (options.errorCallback) {
                options.errorCallback(err);
            }
            return;
        }
        var content = H5PIntegration.contents["cid-" + contentId];
        if (content === undefined) {
            content = H5PIntegration.contents["cid-" + contentId] = {};
        }
        if (!content.contentUserData) {
            content.contentUserData = {};
        }
        var preloadedData = content.contentUserData;
        if (preloadedData[options.subContentId] === undefined) {
            preloadedData[options.subContentId] = {};
        }
        if (data === preloadedData[options.subContentId][dataId]) {
            return;
        }
        preloadedData[options.subContentId][dataId] = data;
        contentUserDataAjax(
            contentId,
            dataId,
            options.subContentId,
            function (error) {
                if (options.errorCallback && error) {
                    options.errorCallback(error);
                }
            },
            data,
            options.preloaded,
            options.deleteOnChange,
            options.async
        );
    };
    H5P.deleteUserData = function (contentId, dataId, subContentId) {
        if (!subContentId) {
            subContentId = 0;
        }
        var preloadedData = H5PIntegration.contents["cid-" + contentId].contentUserData;
        if (preloadedData && preloadedData[subContentId] && preloadedData[subContentId][dataId]) {
            delete preloadedData[subContentId][dataId];
        }
        contentUserDataAjax(contentId, dataId, subContentId, undefined, null);
    };
    H5P.getContentForInstance = function (contentId) {
        var key = "cid-" + contentId;
        var exists = H5PIntegration && H5PIntegration.contents && H5PIntegration.contents[key];
        return exists ? H5PIntegration.contents[key] : undefined;
    };
    H5P.ClipboardItem = function (parameters, genericProperty, specificKey) {
        var self = this;
        var setDimensionsFromFile = function () {
            if (!self.generic) {
                return;
            }
            var params = self.specific[self.generic];
            if (!params.params.file || !params.params.file.width || !params.params.file.height) {
                return;
            }
            self.width = 20;
            self.height = (params.params.file.height / params.params.file.width) * self.width;
        };
        if (!genericProperty) {
            genericProperty = "action";
            parameters = { action: parameters };
        }
        self.specific = parameters;
        if (genericProperty && parameters[genericProperty]) {
            self.generic = genericProperty;
        }
        if (specificKey) {
            self.from = specificKey;
        }
        if (window.H5PEditor && H5PEditor.contentId) {
            self.contentId = H5PEditor.contentId;
        }
        if (!self.specific.width && !self.specific.height) {
            setDimensionsFromFile();
        }
    };
    H5P.clipboardify = function (clipboardItem) {
        if (!(clipboardItem instanceof H5P.ClipboardItem)) {
            clipboardItem = new H5P.ClipboardItem(clipboardItem);
        }
        H5P.setClipboard(clipboardItem);
    };
    H5P.getClipboard = function () {
        return parseClipboard();
    };
    H5P.setClipboard = function (clipboardItem) {
        localStorage.setItem("h5pClipboard", JSON.stringify(clipboardItem));
        H5P.externalDispatcher.trigger("datainclipboard", { reset: false });
    };
    H5P.getLibraryConfig = function (machineName) {
        var hasConfig = H5PIntegration.libraryConfig && H5PIntegration.libraryConfig[machineName];
        return hasConfig ? H5PIntegration.libraryConfig[machineName] : {};
    };
    var parseClipboard = function () {
        var clipboardData = localStorage.getItem("h5pClipboard");
        if (!clipboardData) {
            return;
        }
        try {
            clipboardData = JSON.parse(clipboardData);
        } catch (err) {
            console.error("Unable to parse JSON from clipboard.", err);
            return;
        }
        recursiveUpdate(clipboardData.specific, function (path) {
            var isTmpFile = path.substr(-4, 4) === "#tmp";
            if (!isTmpFile && clipboardData.contentId && !path.match(/^https?:\/\//i)) {
                if (H5PEditor.contentId) {
                    return "../" + clipboardData.contentId + "/" + path;
                } else {
                    return (H5PEditor.contentRelUrl ? H5PEditor.contentRelUrl : "../content/") + clipboardData.contentId + "/" + path;
                }
            }
            return path;
        });
        if (clipboardData.generic) {
            clipboardData.generic = clipboardData.specific[clipboardData.generic];
        }
        return clipboardData;
    };
    var recursiveUpdate = function (params, handler) {
        for (var prop in params) {
            if (params.hasOwnProperty(prop) && params[prop] instanceof Object) {
                var obj = params[prop];
                if (obj.path !== undefined && obj.mime !== undefined) {
                    obj.path = handler(obj.path);
                } else {
                    if (obj.library !== undefined && obj.subContentId !== undefined) {
                        delete obj.subContentId;
                    }
                    recursiveUpdate(obj, handler);
                }
            }
        }
    };
    $(document).ready(function () {
        window.addEventListener("storage", function (event) {
            if (event.key === "h5pClipboard") {
                H5P.externalDispatcher.trigger("datainclipboard", { reset: event.newValue === null });
            }
        });
        var ccVersions = { default: "4.0", "4.0": H5P.t("licenseCC40"), "3.0": H5P.t("licenseCC30"), "2.5": H5P.t("licenseCC25"), "2.0": H5P.t("licenseCC20"), "1.0": H5P.t("licenseCC10") };
        H5P.copyrightLicenses = {
            U: H5P.t("licenseU"),
            "CC BY": { label: H5P.t("licenseCCBY"), link: "http://creativecommons.org/licenses/by/:version", versions: ccVersions },
            "CC BY-SA": { label: H5P.t("licenseCCBYSA"), link: "http://creativecommons.org/licenses/by-sa/:version", versions: ccVersions },
            "CC BY-ND": { label: H5P.t("licenseCCBYND"), link: "http://creativecommons.org/licenses/by-nd/:version", versions: ccVersions },
            "CC BY-NC": { label: H5P.t("licenseCCBYNC"), link: "http://creativecommons.org/licenses/by-nc/:version", versions: ccVersions },
            "CC BY-NC-SA": { label: H5P.t("licenseCCBYNCSA"), link: "http://creativecommons.org/licenses/by-nc-sa/:version", versions: ccVersions },
            "CC BY-NC-ND": { label: H5P.t("licenseCCBYNCND"), link: "http://creativecommons.org/licenses/by-nc-nd/:version", versions: ccVersions },
            "CC0 1.0": { label: H5P.t("licenseCC010"), link: "https://creativecommons.org/publicdomain/zero/1.0/" },
            "GNU GPL": {
                label: H5P.t("licenseGPL"),
                link: "http://www.gnu.org/licenses/gpl-:version-standalone.html",
                linkVersions: { v3: "3.0", v2: "2.0", v1: "1.0" },
                versions: { default: "v3", v3: H5P.t("licenseV3"), v2: H5P.t("licenseV2"), v1: H5P.t("licenseV1") },
            },
            PD: {
                label: H5P.t("licensePD"),
                versions: { "CC0 1.0": { label: H5P.t("licenseCC010"), link: "https://creativecommons.org/publicdomain/zero/1.0/" }, "CC PDM": { label: H5P.t("licensePDM"), link: "https://creativecommons.org/publicdomain/mark/1.0/" } },
            },
            "ODC PDDL": '<a href="http://opendatacommons.org/licenses/pddl/1.0/" target="_blank">Public Domain Dedication and Licence</a>',
            "CC PDM": { label: H5P.t("licensePDM"), link: "https://creativecommons.org/publicdomain/mark/1.0/" },
            C: H5P.t("licenseC"),
        };
        if (H5P.isFramed && H5P.externalEmbed === false) {
            H5P.externalDispatcher.on("*", function (event) {
                window.parent.H5P.externalDispatcher.trigger.call(this, event);
            });
        }
        if (!H5P.preventInit) {
            H5P.init(document.body);
        }
        if (H5PIntegration.saveFreq !== false) {
            var lastStoredOn = 0;
            var storeCurrentState = function () {
                var currentTime = new Date().getTime();
                if (currentTime - lastStoredOn > 250) {
                    lastStoredOn = currentTime;
                    for (var i = 0; i < H5P.instances.length; i++) {
                        var instance = H5P.instances[i];
                        if (instance.getCurrentState instanceof Function || typeof instance.getCurrentState === "function") {
                            var state = instance.getCurrentState();
                            if (state !== undefined) {
                                H5P.setUserData(instance.contentId, "state", state, { deleteOnChange: true, async: false });
                            }
                        }
                    }
                }
            };
            H5P.$window.one("beforeunload unload", function () {
                H5P.$window.off("pagehide beforeunload unload");
                storeCurrentState();
            });
            H5P.$window.on("pagehide", storeCurrentState);
        }
    });
})(H5P.jQuery);
