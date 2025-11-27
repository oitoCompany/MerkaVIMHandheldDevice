sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/merkavim/ewm/manageprodorder/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.merkavim.ewm.manageprodorder.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // initialize application-level models so views have them available immediately
            var oEmptyPickModel = new sap.ui.model.json.JSONModel({ items: [] });
            this.setModel(oEmptyPickModel, "pickItems");

            var oInputFieldsModel = new sap.ui.model.json.JSONModel({
                Location: "LOC-DEV-01",
                Stock: "100",
                Material: "MAT-DEV-001",
                MaterialDescription: "Sample widget (dev)",
                UOM: "EA"
            });
            this.setModel(oInputFieldsModel, "inputFields");

            var oSelectionModel = new sap.ui.model.json.JSONModel({
                Material: "MAT-001",
                ProductionOrder: "PO-1001",
                Operation: "Op-01",
                ReservationStorageLocation: "RS-01",
                LogisticsGroup: "LG-01",
                Remark: "Dev selection sample"
            });
            this.setModel(oSelectionModel, "selection");

            // Add form and items models for IssueInternalOrder
            var oFormModel = new sap.ui.model.json.JSONModel({
                issuingStorageLocation: "",
                internalOrder: "",
                costCenter: "",
                material: "",
                issueQuantity: "",
                remark: ""
            });
            oFormModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
            this.setModel(oFormModel, "form");

            var oItemsModel = new sap.ui.model.json.JSONModel({ items: [] });
            this.setModel(oItemsModel, "items");

            // Add a global view model with initial structure
            var oViewModel = new sap.ui.model.json.JSONModel({
                WERKS: "",
                LGORT: "",
                AUFNR: "",
                KOSTL: "",
                MATNR: "",
                MEINS: "",
                LGPBE: "",
                LABST: 0,
                MAKTX: "",
                BKTXT: "",
                SPRAS: sap.ui.getCore().getConfiguration().getLanguage() || "E",
                PICKING_QTY: 0
            });
            oViewModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
            this.setModel(oViewModel, "view");

            // --- User model (placeholder data; can be replaced with backend or auth provider) ---
            try {
                var sStoredUser = window.localStorage && window.localStorage.getItem("appUserProfile");
                var oUserData = sStoredUser ? JSON.parse(sStoredUser) : {
                    name: "",
                    email: "",
                    loggedIn: false,
                    authChecked: false
                };
                // Ensure boolean loggedIn consistency if stored profile misses it
                if (typeof oUserData.loggedIn !== "boolean") {
                    oUserData.loggedIn = !!(oUserData.username || oUserData.name);
                }
                if (typeof oUserData.authChecked !== "boolean") {
                    oUserData.authChecked = false;
                }
                var oUserModel = new sap.ui.model.json.JSONModel(oUserData);
                oUserModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
                this.setModel(oUserModel, "user");
            } catch (e) {
                var oFallbackUserModel = new sap.ui.model.json.JSONModel({ name: "", email: "", loggedIn: false, authChecked: false });
                this.setModel(oFallbackUserModel, "user");
            }

            // diagnostic log to verify component-level models are present at startup
            try {
                console.log("[Component] initialized models:", {
                    pickItems: this.getModel("pickItems") && this.getModel("pickItems").getData(),
                    inputFields: this.getModel("inputFields") && this.getModel("inputFields").getData(),
                    selection: this.getModel("selection") && this.getModel("selection").getData()
                });
            } catch (e) { /* ignore in environments without console */ }

                // Diagnostic log for form model
                try {
                    console.log("[Component] form model instance:", this.getModel("form"));
                    console.log("[Component] form model binding mode:", this.getModel("form").getDefaultBindingMode());
                    console.log("[Component] form model initial data:", this.getModel("form").getData());
                } catch (e) { /* ignore in environments without console */ }

            // enable routing
            this._installRouteGuards();
            this.getRouter().initialize();
        }
        ,
        /**
         * Install a small guard on the router to reset per-app models ONLY when navigating out of home (View1).
         * This ensures a fresh state every time a user launches an app from the home screen.
         */
        _installRouteGuards: function() {
            var oRouter = this.getRouter();
            var that = this;
            this._lastRouteName = undefined;

            // Use beforeRouteMatched so models are cleared before the new view is created/bound
            oRouter.attachBeforeRouteMatched(function(oEvent){
                var sNextRoute = oEvent.getParameter("name");
                var sPrevRoute = that._lastRouteName;

                // Authentication guard: once auth checked, if not logged in, force navigation to Logout view
                try {
                    var oUserModel = that.getModel("user");
                    var bAuthChecked = !!(oUserModel && oUserModel.getProperty("/authChecked"));
                    var bLoggedIn = !!(oUserModel && oUserModel.getProperty("/loggedIn"));
                    if (bAuthChecked && !bLoggedIn && sNextRoute !== "Logout") {
                        // Replace history so back won't lead into protected routes
                        oRouter.navTo("Logout", {}, true);
                        that._lastRouteName = "Logout";
                        return; // stop further processing for this navigation
                    }
                } catch (eAuth) { /* ignore guard errors */ }

                // Only wipe when coming specifically from the home route
                if (sPrevRoute === "RouteView1") {
                    that._resetModelsForRoute(sNextRoute);
                }

                that._lastRouteName = sNextRoute;
            });
        },

        /**
         * Reset models for a given target route (app entry).
         * Add a case here whenever a new app entry route is introduced.
         * @param {string} sRouteName Matched route name
         */
        _resetModelsForRoute: function(sRouteName){
            try {
                switch (sRouteName) {
                    case "ProductionOrder":
                        // Clear picking items and input header for Production Order flow
                        var oPickItems = this.getModel("pickItems");
                        oPickItems && oPickItems.setData({ items: [] });

                        var oHeader = this.getModel("inputFields");
                        oHeader && oHeader.setData({
                            Location: "",
                            Stock: "",
                            Material: "",
                            MaterialDescription: "",
                            UOM: ""
                        });

                        // Remove any leftover validation/result data from prior sessions
                        if (this.getModel("validData")) {
                            this.setModel(null, "validData");
                        }
                         if (this.getModel("view")) {
                            this.setModel(null, "view");
                        }
                        break;

                    case "IssueInternalOrder":
                        // Reset form, items, and working view state for Issue Internal Order flow
                        var oForm = this.getModel("form");
                        oForm && oForm.setData({
                            issuingStorageLocation: "",
                            internalOrder: "",
                            costCenter: "",
                            material: "",
                            issueQuantity: "",
                            remark: ""
                        });

                        var oItems = this.getModel("items");
                        oItems && oItems.setData({ items: [] });

                        var oViewModel = this.getModel("view");
                        oViewModel && oViewModel.setData({
                            WERKS: "",
                            LGORT: "",
                            AUFNR: "",
                            KOSTL: "",
                            MATNR: "",
                            MEINS: "",
                            LGPBE: "",
                            LABST: 0,
                            MAKTX: "",
                            BKTXT: "",
                            SPRAS: sap.ui.getCore().getConfiguration().getLanguage() || "E",
                            PICKING_QTY: 0
                        });
                        break;

                    case "DigitalSignature":
                        // Reset Digital Signature model
                        var oDigitalSignatureModel = this.getModel("digitalSignature");
                        if (!oDigitalSignatureModel) {
                            oDigitalSignatureModel = new sap.ui.model.json.JSONModel({
                                MBLNR: "",
                                MJAHR: "",
                                BUDAT: "",
                                BLDAT: "",
                                USNAM: "",
                                items: [],
                                documentLoaded: false,
                                signatureData: ""
                            });
                            this.setModel(oDigitalSignatureModel, "digitalSignature");
                        } else {
                            oDigitalSignatureModel.setData({
                                MBLNR: "",
                                MJAHR: "",
                                BUDAT: "",
                                BLDAT: "",
                                USNAM: "",
                                items: [],
                                documentLoaded: false,
                                signatureData: ""
                            });
                        }
                        break;

                    default:
                        // For other routes we do nothing by default. Extend as needed.
                        break;
                }

                // Optional diagnostics
                try {
                    console.log("[Component] Reset models due to navigation from home =>", sRouteName);
                } catch(e) {}
            } catch (e) {
                // Never block navigation due to a reset failure
                try { console.error("[Component] Model reset failed:", e); } catch(_) {}
            }
        }
    });
});