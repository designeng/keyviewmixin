(function (factory) {
    "use strict";

    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'backbone', 'jquery'], factory);
    } else {
        factory(_, Backbone, $);
    }
}(function (_, Backbone, $) {
    "use strict";

    var _delegateEvents = Backbone.View.prototype.delegateEvents;
    var _undelegateEvents = Backbone.View.prototype.undelegateEvents;
    var getKeyCode = function(key) {
        return (key.length === 1) ?
            key.toUpperCase().charCodeAt(0) : BackboneKeysMap[key];
    };

    // Map keyname to keycode
    var BackboneKeysMap = {
        backspace: 8,
        tab: 9,
        enter: 13,
        space: 32,

        // Temporal modifiers
        shift: 16,
        ctrl: 17,
        alt: 18,
        meta: 91,

        // Modal
        caps_lock: 20,
        esc: 27,
        num_lock: 144,

        // Navigation
        page_up: 33,
        page_down: 34,
        end: 35,
        home: 36,
        left: 37,
        up: 38,
        right: 39,
        down: 40,

        // Insert/delete
        insert: 45,
        'delete': 46,

        // F keys
        f1: 112,
        f2: 113,
        f3: 114,
        f4: 115,
        f5: 116,
        f6: 117,
        f7: 118,
        f8: 119,
        f9: 120,
        f10: 121,
        f11: 122,
        f12: 123
    };

    // Aliased names to make sense on several platforms
    _.each({
        'options' : 'alt',
        'return': 'enter'
    }, function(real, alias) {
        BackboneKeysMap[alias] = BackboneKeysMap[real];
    });

    // should be used as mixin to backbone/marionette views
    var KeysViewMixin = Backbone.View.extend({

        // Allow pr view what specific event to use
        // Keydown is defaulted as it allows for press-and-hold
        bindKeysOn : 'keydown',

        // The Backbone-y way would be to have
        // keys scoped to `this.el` as default,
        // however it would be a bigger surprise
        // considering how you'd expect keyboard
        // events to work
        // But users should be able to choose themselves
        bindKeysScoped : false,

        // The actual element to bind events to
        bindTo : null,

        // Hash of bound listeners
        _keyEventBindings : null,

        // Override delegate events
        delegateEvents : function() {
            _delegateEvents.apply(this, Array.prototype.slice.apply(arguments));
            this.delegateKeys();
            return this;
        },

        // Clears all callbacks previously bound to the view with `delegateEvents`.
        // You usually don't need to use this, but may wish to if you have multiple
        // Backbone views attached to the same DOM element.
        undelegateEvents: function() {
            this.undelegateKeys();
            _undelegateEvents.apply(this, arguments);
            return this;
        },

        // Actual delegate keys
        delegateKeys : function(keys) {
            this.undelegateKeys();

            if (!this.bindTo) {
                this.bindTo = (this.bindKeysScoped || typeof $ === "undefined") ? this.$el : $(document);
            }
            this.bindTo.on(this.bindKeysOn + '.delegateKeys' + this.cid, _.bind(this.triggerKey, this));

            keys = keys || (this.keys);
            if (keys) {
                _.each(keys, function(method, key) {
                    this.keyOn(key, method);
                }, this);
            }
            return this;
        },

        // Undelegate keys
        undelegateKeys : function() {
            this._keyEventBindings = {};
            if (this.bindTo) {
                this.bindTo.off(this.bindKeysOn + '.delegateKeys' + this.cid);
            }
            return this;
        },

        // Utility to get the name of a key
        // based on its keyCode
        keyName : function(keyCode) {
            var keyName;
            for (keyName in BackboneKeysMap)
                if (BackboneKeysMap[keyName] === keyCode) return keyName;
            return String.fromCharCode(keyCode);
        },

        // Internal real listener for key events that
        // forwards any relevant key presses
        triggerKey : function(e) {
            var key;
            if (_.isObject(e)) key = e.which;
            else if (_.isString(e)) key = getKeyCode(e);
            else if (_.isNumber(e)) key = e;

            _(this._keyEventBindings[key]).each(function(listener) {
                var trigger = true;
                if (listener.modifiers) {
                    trigger = _(listener.modifiers).all(function(modifier) {
                        return e[modifier + 'Key'] === true;
                    });
                }
                if (trigger) listener.method(e, listener.key);
            });
            return this;
        },

        // Doing the real work of binding key events
        keyOn : function(key, method) {
            key = key.split(' ');
            if (key.length > 1) {
                var l = key.length;
                while (l--)
                    this.keyOn(key[l], method);
                return;
            }
            else key = key.pop().toLowerCase();

            // Subtract modifiers
            var components = key.split('+');
            key = components.shift();

            var keyCode = getKeyCode(key);

            if (!this._keyEventBindings.hasOwnProperty(keyCode)) {
                this._keyEventBindings[keyCode] = [];
            }

            if (!_.isFunction(method)) method = this[method];

            this._keyEventBindings[keyCode].push({
                key : key,
                modifiers : (components || false),
                method: _.bind(method, this)
            });
            return this;
        },

        keyOff : function(key, method) {
            method = (method || false);
            if (key === null) {
                this._keyEventBindings = {};
                return this;
            }
            var keyCode = getKeyCode(key);
            if (!_.isFunction(method)) method = this[method];
            if (!method) {
                this._keyEventBindings[keyCode] = [];
                return this;
            }
            this._keyEventBindings[keyCode] = _.filter(
                this._keyEventBindings[keyCode],
                function(data, index) {
                    return data.method === method;
                }
            );
            return this;
        }
    });

    return KeysViewMixin;
}));
