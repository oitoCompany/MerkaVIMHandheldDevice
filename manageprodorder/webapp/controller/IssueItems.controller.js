sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageBox) {
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.IssueItems", {
        onInit: function () {
            var oView = this.getView();
            var oRouter = this.getOwnerComponent().getRouter();
            var that = this;
            // Point 3 responsive toggle (cards vs table) on init & after resize
            this.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox2" });
            sap.ui.Device.media.attachHandler(function(){
                that.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox2" });
            });
            var fnUpdateSummary = function() {
                var oIssueItemsModel = that.getOwnerComponent().getModel("issueItems");
                var aItems = (oIssueItemsModel && oIssueItemsModel.getProperty("/items")) || [];
                var sum = aItems.reduce(function(acc, item) {
                    var val = parseFloat(item.PICKING_QTY);
                    return acc + (isNaN(val) ? 0 : val);
                }, 0);
                var oInput = oView.byId("inputSummary");
                if (oInput) {
                    oInput.setValue(sum);
                }
            };
            // Initial summary
            fnUpdateSummary();
            // Update summary on every route match (view show)
            if (oRouter && oRouter.getRoute("IssueItems")) {
                oRouter.getRoute("IssueItems").attachPatternMatched(function() {
                    fnUpdateSummary();
                });
            }
        },
        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("ProductionOrderContinue");
        },

        /**
         * Open the sort dialog (ViewSettingsDialog)
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("issueSortDialog");
            if (oDlg) {
                oDlg.open();
            }
        },

        /**
         * Apply sorting chosen in ViewSettingsDialog to both table (desktop) and list (mobile)
         * @param {sap.ui.base.Event} oEvent confirm event from ViewSettingsDialog
         */
        onSortConfirm: function (oEvent) {
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem && mParams.sortItem.getKey();
            var bDescending = !!mParams.sortDescending;

            if (!sPath) { return; }

            try {
                var oSorter = new sap.ui.model.Sorter(sPath, bDescending);

                // Desktop/tablet table
                var oTable = this.byId("issueItemsTable");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                // Mobile list
                var oList = this.byId("issueMobileCardList");
                if (oList) {
                    var oListBinding = oList.getBinding("items");
                    if (oListBinding && oListBinding.sort) {
                        oListBinding.sort(new sap.ui.model.Sorter(sPath, bDescending));
                    }
                }
            } catch (e) {
                /* eslint no-console: 0 */
                console.warn("IssueItems sort apply failed", e);
            }
        },



        onSave: function () {
            // Retrieve selected issue items model
            var oIssueItemsModel = this.getOwnerComponent().getModel("issueItems");
            var aItems = (oIssueItemsModel && oIssueItemsModel.getProperty("/items")) || [];
            var header = this.getOwnerComponent().getModel("inputFields").getData();
            var that = this;

            var aHeader = {
                LGPBE: header.Location,
                LABST: header.Stock,
                MATNR: header.Material,
                MAKTX: header.MaterialDescription,
                MEINS: header.UOM
            };

            var oValidDataModel = this.getOwnerComponent().getModel("validData");
            var validData = oValidDataModel ? oValidDataModel.getData() : {};

            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "ISSUE_PR_3_SAVE";

            // Build the common payload structure
            var buildPayload = function (sCheckFlag) {
                return {
                    HEAD: aHeader,
                    ITEM: aItems,
                    DATA: validData,
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

            // Generic caller for the save endpoint
            var callSave = function (sCheckFlag) {
                return new Promise(function (resolve, reject) {
                    $.ajax({
                        url: baseUrl + url,
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify(buildPayload(sCheckFlag)),
                        success: function (oResponse) { resolve(oResponse); },
                        error: function () { reject(new Error("REQUEST_FAILED")); }
                    });
                });
            };

            // UI busy on during processing
            this.getView().setBusy(true);

            // Step 1: validation-only call with CHECK='X'
            callSave("X").then(function (oResponse) {
                var sMsg = (oResponse && oResponse.MSG && oResponse.MSG.MSGTX) || "";
                var sType = (oResponse && oResponse.MSG && oResponse.MSG.MSGTY) || "";

                // If no message returned -> proceed to actual save
                if (!sMsg) {
                    return callSave("");
                }

                // If error -> show and stop
                if (sType === "E") {
                    that.getView().setBusy(false);
                    MessageBox.error(sMsg);
                    // Stop chain by throwing
                    throw new Error("VALIDATION_ERROR");
                }

                // Warning or Information -> ask user
                return new Promise(function (resolve, reject) {
                    var fnProceed = function () { resolve(callSave("")); };
                    var fnCancel = function () { reject(new Error("USER_CANCELLED")); };

                    // Prefer matching box to the type
                    var oBundle = that.getOwnerComponent().getModel("i18n").getResourceBundle();
                    var sSaveTxt = oBundle.getText("saveLabel");
                    var sCancelTxt = oBundle.getText("cancelLabel");
                    var oOptions = {
                        actions: [sSaveTxt, sCancelTxt],
                        emphasizedAction: sSaveTxt,
                        onClose: function (sAction) {
                            if (sAction === sSaveTxt) {
                                fnProceed();
                            } else {
                                // ensure busy is cleared on cancel
                                that.getView().setBusy(false);
                                fnCancel();
                            }
                        }
                    };

                    if (sType === "W") {
                        MessageBox.warning(sMsg, oOptions);
                    } else {
                        // Treat others (e.g., I) as information
                        MessageBox.information(sMsg, oOptions);
                    }
                });
            }).then(function (oFinalResponse) {
                // Handle final save response
                // If previous branch resolved with a Promise from callSave, unwrap it
                if (oFinalResponse && typeof oFinalResponse.then === "function") {
                    return oFinalResponse.then(function (oResolved) { return oResolved; });
                }
                return oFinalResponse;
            }).then(function (oResolvedResponse) {
                // Success step after actual save
                that.getView().setBusy(false);
                if (oResolvedResponse && oResolvedResponse.MSG && oResolvedResponse.MSG.MSGTY === "S") {
                    var aCreated = [ { DocumentNumber: oResolvedResponse.DOC && oResolvedResponse.DOC.MBLNR } ];
                    var oCreatedModel = new JSONModel({ items: aCreated });
                    that.getOwnerComponent().setModel(oCreatedModel, "created");
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("DocumentCreated");
                } else {
                    var sErr = (oResolvedResponse && oResolvedResponse.MSG && oResolvedResponse.MSG.MSGTX) || that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("failedToSaveIssueItems");
                    MessageBox.error(sErr);
                }
            }).catch(function (err) {
                // Catch any failure except the intentionally thrown VALIDATION_ERROR or USER_CANCELLED
                if (err && (err.message === "VALIDATION_ERROR" || err.message === "USER_CANCELLED")) {
                    return; // already handled
                }
                that.getView().setBusy(false);
                MessageBox.error(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("failedToSaveIssueItems"));
            });
        }
    });
});