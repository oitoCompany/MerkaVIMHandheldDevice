sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/layout/form/SimpleForm"
], function (BaseController, MessageBox, SimpleForm) {
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.IssueInternalOrderItems", {
        onInit: function(){
            var that = this;
            // initial toggle (point 3) for mobile cards vs table
            this.toggleMobileDesktop({ mobile: "iioMobileCardsContainer", desktop: "itemsTable" });
            sap.ui.Device.media.attachHandler(function(){
                that.toggleMobileDesktop({ mobile: "iioMobileCardsContainer", desktop: "itemsTable" });
            });
            
            // Attach route matched handler to clear remark field
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("IssueInternalOrderItems").attachPatternMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function() {
            // Clear the BKTXT field when navigating to this page
            var oViewModel = this.getOwnerComponent().getModel("view");
            if (oViewModel) {
                oViewModel.setProperty("/BKTXT", "");
            }
        },

        onRemarkLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oViewModel = this.getOwnerComponent().getModel("view");
            if (oViewModel) {
                oViewModel.setProperty("/BKTXT", sValue);
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("IssueInternalOrder");
        },

        onEditItem: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var oContext = oItem.getBindingContext("items");
            var oModel = oContext.getModel();
            var aItems = oModel.getProperty("/items");
            var iIndex = oContext.getPath().split("/").pop();
            var oData = Object.assign({}, aItems[iIndex]);

            // Use SimpleForm for better alignment
            var oSimpleForm = new SimpleForm({
                editable: true,
                layout: "ResponsiveGridLayout",
                content: [
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("internalOrderLabel") }),
                    new sap.m.Input({ value: oData.AUFNR, liveChange: function (e) { oData.AUFNR = e.getParameter("value"); } }),
                    // Add Cost Center (KOSTL) below AUFNR
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("costCenterLabel") }),
                    new sap.m.Input({ value: oData.KOSTL, liveChange: function (e) { oData.KOSTL = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("storageLocationLabel") }),
                    new sap.m.Input({ value: oData.LGORT, liveChange: function (e) { oData.LGORT = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("materialNumberLabel") }),
                    new sap.m.Input({ value: oData.MATNR, liveChange: function (e) { oData.MATNR = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("pickingQtyLabel") }),
                    new sap.m.Input({ value: oData.PICKING_QTY, liveChange: function (e) { oData.PICKING_QTY = e.getParameter("value"); } })
                ]
            });

            var oDialog = new sap.m.Dialog({
                title: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("editItemTitle"),
                content: [oSimpleForm],
                beginButton: new sap.m.Button({
                    text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("saveLabel"),
                    press: function () {
                        aItems[iIndex] = oData;
                        oModel.setProperty("/items", aItems);
                        oDialog.close();
                    }
                }),
                endButton: new sap.m.Button({
                    text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("cancelLabel"),
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });
            oDialog.open();
        },

        onDeleteItem: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var oContext = oItem.getBindingContext("items");
            var oModel = oContext.getModel();
            var aItems = oModel.getProperty("/items");
            var iIndex = oContext.getPath().split("/").pop();
            aItems.splice(iIndex, 1);
            oModel.setProperty("/items", aItems);
        },

        /**
         * Open sort dialog
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("iioSortDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Apply sorting from ViewSettingsDialog to both table (desktop) and list (mobile)
         * @param {sap.ui.base.Event} oEvent confirm event
         */
        onSortConfirm: function (oEvent) {
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem && mParams.sortItem.getKey();
            var bDescending = !!mParams.sortDescending;

            if (!sPath) { return; }

            try {
                var oSorter = new sap.ui.model.Sorter(sPath, bDescending);

                var oTable = this.byId("itemsTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                var oList = this.byId("iioMobileCardList");
                if (oList) {
                    var oListBinding = oList.getBinding("items");
                    if (oListBinding && oListBinding.sort) {
                        oListBinding.sort(new sap.ui.model.Sorter(sPath, bDescending));
                    }
                }
            } catch (e) {
                /* eslint no-console: 0 */
                // Non-fatal sort error
                console.warn("IIO sort apply failed", e);
            }
        },

        /**
         * Sort handler for table columns
         */
        onSort: function(oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("itemsTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },

        onContinue: function () {
            var oViewModel = this.getOwnerComponent().getModel("view");
            var oItemsModel = this.getView().getModel("items");
            var oGlobalWerksModel = this.getOwnerComponent().getModel("globalWerks");
            var oData = oViewModel ? oViewModel.getData() : {};
            var that = this;

            // Header text from first item
            var aCurrentItems = oItemsModel ? (oItemsModel.getProperty("/items") || []) : [];

            // Use WERKS from global model if available
            if (oGlobalWerksModel && oGlobalWerksModel.getProperty("/WERKS")) {
                oData.WERKS = oGlobalWerksModel.getProperty("/WERKS");
            }

            // Get remarks from the remark field on this view
            var oRemarkInput = this.getView().byId("remarkInput");
            if (oRemarkInput) {
                oData.BKTXT = oRemarkInput.getValue();
            }

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_ORD_2_SAVE";

            // Build payload with dynamic CHECK flag
            var buildPayload = function (sCheckFlag) {
                return {
                    DATA: oData,
                    ITEM: aCurrentItems,
                    CHECK: sCheckFlag || "",
                    DOC: {
                        MBLNR: "",
                        MJAHR: ""
                    },
                    MSG: {
                        MSGTX: "",
                        MSGTY: ""
                    }
                };
            };

            // Ajax wrapper returning a Promise
            var callSave = function (sCheckFlag) {
                return new Promise(function (resolve, reject) {
                    $.ajax({
                        url: baseUrl + url,
                        type: "POST",
                        contentType: "application/json",
                        data: JSON.stringify(buildPayload(sCheckFlag)),
                        success: function (oResp) { resolve(oResp); },
                        error: function () { reject(new Error("REQUEST_FAILED")); }
                    });
                });
            };

            // Busy on while processing
            this.getView().setBusy(true);

            // Step 1: Validation call with CHECK='X'
            callSave("X").then(function (oResp) {
                var sMsg = (oResp && oResp.MSG && oResp.MSG.MSGTX) || "";
                var sType = (oResp && oResp.MSG && oResp.MSG.MSGTY) || "";

                if (!sMsg) {
                    // No message -> proceed with actual save
                    return callSave("");
                }

                if (sType === "E") {
                    // Error -> show and stop
                    that.getView().setBusy(false);
                    MessageBox.error(sMsg);
                    throw new Error("VALIDATION_ERROR");
                }

                // Warning or Information -> let user decide
                return new Promise(function (resolve, reject) {
                    var oBundle = that.getOwnerComponent().getModel("i18n").getResourceBundle();
                    var sSaveTxt = oBundle.getText("saveLabel");
                    var sCancelTxt = oBundle.getText("cancelLabel");
                    var options = {
                        actions: [sSaveTxt, sCancelTxt],
                        emphasizedAction: sSaveTxt,
                        onClose: function (sAction) {
                            if (sAction === sSaveTxt) {
                                resolve(callSave(""));
                            } else {
                                // ensure busy is cleared when user cancels
                                that.getView().setBusy(false);
                                reject(new Error("USER_CANCELLED"));
                            }
                        }
                    };
                    if (sType === "W") {
                        MessageBox.warning(sMsg, options);
                    } else {
                        MessageBox.information(sMsg, options);
                    }
                });
            }).then(function (oFinal) {
                // If previous step resolved with a Promise (callSave), unwrap it
                if (oFinal && typeof oFinal.then === "function") {
                    return oFinal.then(function (r) { return r; });
                }
                return oFinal;
            }).then(function (oSaved) {
                that.getView().setBusy(false);
                if (oSaved && oSaved.MSG && oSaved.MSG.MSGTY === "S") {
                    // Navigate to DocumentCreated view and pass document data
                    that.getOwnerComponent().getRouter().navTo("InternalOrderCreated", {
                        MBLNR: oSaved.DOC && oSaved.DOC.MBLNR,
                        MJAHR: oSaved.DOC && oSaved.DOC.MJAHR
                    });
                } else if (oSaved && oSaved.MSG && oSaved.MSG.MSGTY === "E") {
                    MessageBox.error(oSaved.MSG.MSGTX || that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("failedToSaveIssueOrder"));
                } else {
                    // Non-success non-error message (if any)
                    var sText = (oSaved && oSaved.MSG && oSaved.MSG.MSGTX) || that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("failedToSaveIssueOrder");
                    MessageBox.information(sText);
                }
            }).catch(function (err) {
                if (err && (err.message === "VALIDATION_ERROR" || err.message === "USER_CANCELLED")) {
                    return; // already handled
                }
                that.getView().setBusy(false);
                MessageBox.error(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("failedToSaveIssueOrder"));
            });
        }
    });
});
