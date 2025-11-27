sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            // Provide shortcut flags at root to simplify bindings: device>/isPhone
            try {
                oModel.setProperty("/isPhone", !!Device.system.phone);
                oModel.setProperty("/isTablet", !!Device.system.tablet);
                oModel.setProperty("/isDesktop", !!Device.system.desktop);
            } catch (e) { /* ignore */ }
            return oModel;
        }
    };

});