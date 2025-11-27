sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/Device"
], function(Controller, Device) {
    "use strict";

    /**
     * Base controller adding convenience helpers for responsive logic (point 3).
     * All app controllers can extend this instead of sap/ui/core/mvc/Controller.
     */
    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.BaseController", {
        getRouter: function() {
            return this.getOwnerComponent().getRouter();
        },
        isPhone: function() {
            // Single source of truth via sap/ui/Device
            return Device.system.phone === true;
        },
        getDeviceModel: function() {
            return this.getOwnerComponent().getModel("device");
        },
        // Generic toggler for a pair of controls (e.g. table vs card container)
        toggleMobileDesktop: function(mIds) {
            if (!mIds) { return; }
            var bPhone = this.isPhone();
            if (mIds.mobile) {
                var oMobile = this.byId(mIds.mobile);
                oMobile && oMobile.setVisible(bPhone);
            }
            if (mIds.desktop) {
                var oDesktop = this.byId(mIds.desktop);
                oDesktop && oDesktop.setVisible(!bPhone);
            }
        }
    });
});
