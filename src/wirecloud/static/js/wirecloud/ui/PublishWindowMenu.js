/**
 * Specific class for publish windows
 */
var PublishWindowMenu = function PublishWindowMenu(workspace) {

    var fields, marketFields;
    marketFields = this._loadAvailableMarkets();

    fields = [
        {
            'type': 'group',
            'shortTitle': gettext('General info'),
            'fields': [
                {name: 'name', label: gettext('Mashup Name'), type: 'text', required: true, initialValue: workspace.getName(), defaultValue: workspace.getName()},
                {name: 'vendor', label: gettext('Vendor'), type:'text',  required: true},
                {name: 'version', label: gettext('Version'), type:'text',  required: true},
                {name: 'email', label: gettext('Email'), type:'text',  required: true},
                {name: 'description', label: gettext('Description'), type:'longtext'},
                {name: 'wikiURI', label: gettext('Homepage'), type:'text'},
                {name: 'author', label: gettext('Author'), type:'text',  initialValue: ezweb_user_name, defaultValue: ezweb_user_name}
            ]
        },
        {
            'type': 'group',
            'shortTitle': gettext('Media'),
            'fields': [
                {
                    name: 'imageURI',
                    label: gettext('Image shown in catalogue (170x80 px)'),
                    type: 'text'
                }
            ]
        },
        {
            'type': 'group',
            'shortTitle': gettext('Advanced'),
            'fields': [
                {name: 'readOnlyWidgets', label: gettext('Block widgets'), type: 'boolean'},
                {name: 'readOnlyConnectables', label: gettext('Block connections'), type: 'boolean'}
            ]
        },
        {
            'type': 'group',
            'shortTitle': gettext('Publish place'),
            'fields': marketFields
        }
    ];

    this._addVariableParametrization(workspace, fields);
    FormWindowMenu.call(this, fields, gettext('Publish Workspace'), 'publish_workspace');

    //fill a warning message
    var warning = document.createElement('div');
    Element.extend(warning);
    warning.addClassName('msg warning');
    warning.update(gettext("WARNING: configured and stored data in your workspace (properties and preferences except passwords) will be shared!"));
    this.windowContent.insertBefore(warning, this.form.wrapperElement);
}
PublishWindowMenu.prototype = new FormWindowMenu();

PublishWindowMenu.prototype._addVariableParametrization = function (workspace, fields) {
    var i, tab_keys, tab_field;

    this.workspace = workspace;
    tab_keys = workspace.tabInstances.keys();

    for (i = 0; i < tab_keys.length; i += 1) {
        tab_field = this._parseTab(workspace.tabInstances.get(tab_keys[i]));
        if (tab_field !== null) {
            fields.push(tab_field);
        }
    }
};

PublishWindowMenu.prototype._parseTab = function (tab) {

    var i, name, iwidget, iwidgets, iwidget_params, pref_params,
        prop_params, variable, variables, varManager, var_elements,
        fields;

    varManager = tab.workspace.getVarManager();
    iwidgets = tab.getDragboard().getIWidgets();
    fields = [];

    for (i = 0; i < iwidgets.length; i++) {
        iwidget = iwidgets[i];
        variables = varManager.getIWidgetVariables(iwidget.getId());
        pref_params = [];
        prop_params = [];

        for (name in variables) {
            variable = variables[name];
            if (variable.vardef.aspect === Variable.prototype.USER_PREF) {
                pref_params.push({
                    label: variable.getLabel(),
                    type: 'parametrizableValue',
                    variable: variable,
                    canBeHidden: true,
                    parentWindow: this
                });
            } else if (variable.vardef.aspect === Variable.prototype.PROPERTY) {
                prop_params.push({
                    label: variable.getLabel(),
                    type: 'parametrizableValue',
                    variable: variable,
                    parentWindow: this
                });
            }
        }

        var_elements = {};
        if (pref_params.length !== 0) {
            var_elements['pref'] = {
                label: gettext('Preferences'),
                type: 'fieldset',
                fields: pref_params.sort(this._sortVariables)
            }
        }
        if (prop_params.length !== 0) {
            var_elements['props'] = {
                label: gettext('Properties'),
                type: 'fieldset',
                fields: prop_params.sort(this._sortVariables)
            }
        }

        if (pref_params.length + prop_params.length !== 0) {
            fields.push({
                name: iwidget.id,
                label: iwidget.name,
                type: 'fieldset',
                nested: true,
                fields: var_elements
            });
        }
    }

    if (fields.length > 0) {
        return {
            'shortTitle': tab.tabInfo.name,
            'fields': fields,
            'nested': true,
            'name': 'tab-' + tab.tabInfo.name
        }
    } else {
        return null;
    }
};

PublishWindowMenu.prototype._sortVariables = function (var1, var2) {
    return var1.variable.vardef.order - var2.variable.vardef.order;
};

PublishWindowMenu.prototype._loadAvailableMarkets = function _loadAvailableMarkets() {
    // Take available marketplaces from the instance of marketplace view
    var views = LayoutManagerFactory.getInstance().viewsByName['marketplace'].viewsByName;
    var key, marketInfo = [];

    for (key in views) {
        marketInfo = marketInfo.concat(views[key].getPublishEndpoint());
    }
    return marketInfo;
};

PublishWindowMenu.prototype.show = function(parentWindow) {
    WindowMenu.prototype.show.call(this, parentWindow);
    this.setValue(this.workspace.workspaceGlobalInfo.workspace.params);
};

PublishWindowMenu.prototype.setFocus = function() {
    this.form.fieldInterfaces['name'].focus();
};

PublishWindowMenu.prototype._createMarketplaceData = function _createMarketplaceData (data) {
    var views = LayoutManagerFactory.getInstance().viewsByName['marketplace'].viewsByName;
    var key, marketplaces = [];
    for (key in views) {
        marketplaces = marketplaces.concat(views[key].getPublishData(data))
    }
    return marketplaces;
};

PublishWindowMenu.prototype.executeOperation = function executeOperation (data) {
    var key;

    data.parametrization = {};
    data.marketplaces = this._createMarketplaceData(data);

    for (key in data) {
        if (key.startsWith('tab-')) {
            EzWebExt.merge(data.parametrization, data[key]);
            delete data[key];
        }
    }
    OpManagerFactory.getInstance().activeWorkspace.publish(data);
};
