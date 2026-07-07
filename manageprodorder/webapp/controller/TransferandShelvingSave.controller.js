sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "com/merkavim/ewm/manageprodorder/model/formatter",
    "sap/m/ViewSettingsFilterItem",
    "sap/m/ViewSettingsItem",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, MessageBox, formatter, ViewSettingsFilterItem, ViewSettingsItem, Filter, Sorter) {
    // formatter is loaded for view binding
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.TransferandShelvingSave", {
        formatter: formatter,
        onInit: function () {
            // this._aHoverFocusDelegates = [];
            // Disable custom hover-to-focus behavior
            // this._hoverFocusDisabled = true; // commented per request: only comments, no deletions
            // Use global device model (point 3). No local override.
            // Ensure initial visibility for mobile cards vs table if needed
            // this.toggleMobileDesktop({ mobile: "mobileCardsContainer", desktop: "_IDGenVBox1" });

            // `inputFields` model is initialized at the component level; rely on that model here

            // Ensure pickItems model is available when the view is displayed
            var oComponent = this.getOwnerComponent();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("TransferandShelvingSave").attachPatternMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
            //  var oList = this.byId("materialsList");
            // if (oList && oList.getItems) {
            //     var oItems = oList.getItems() || [];
            //     oItems.forEach(function (oItem) {
            //         var Input = oItem.getContent()[0].mAggregations.content[0].mAggregations.items[4].mAggregations.items[0].mAggregations.items[1];
            //         if (Input && Input.addEventDelegate) {
            //             Input.addEventDelegate({
            //                 onfocusin: function () {
            //                     setTimeout(function () {

            //                         Input.$().find("input").select();
            //                         this.selectText(0, this.getValue().length);
            //                     });
            //                 }
            //             });
            //         }
            //     });
            // }



        },
       








        onExit: function () {

        },


        onRemarkLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oViewModel = this.getOwnerComponent().getModel("validData");
            if (oViewModel) {
                oViewModel.setProperty("/BKTXT", sValue);
            }
        },
        onNavBack: function () {
            // this.getOwnerComponent().getModel("PickForCartCheckModel").setProperty("/FLAG", "X");
            // this.onClearSelection();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("TransferandShelvingItems", {

            }, true);
        },
       

        /**
         * Navigate to IssueItems but only with rows marked (selected === true)
         */
        onSaveandFinish: function () {
            var that = this;
            var oComponent = this.getOwnerComponent();
            var oList = '';
            var oPickModel = oComponent.getModel("MaterialDocumentItemModel");
             var aItems =oComponent.getModel("TransferSaveItems").getProperty("/items") || [];
             var aSelected = [];
             var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "SHELVING_4_SAVE";

            // Build the common payload structure
            var buildPayload = function (sCheckFlag) {
                return {
                    HEAD: oPickModel.getProperty("/HEAD") || {},
                    ITEM: aItems,
                    DATA: oPickModel.getProperty("/DATA") || {},
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
                    // oRouter.navTo("DocumentCreated");
                      oRouter.navTo("InternalOrderCreated", {
                        MBLNR: aCreated[0].DocumentNumber,
                        MJAHR: ""
                    });
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
           

            
           
           

          

           
           
        },
        formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },

       

      



        _onRouteMatched: function (oEvent) {
            // var oArgs = oEvent.getParameter("arguments") || {};
            // var NFlAG = oArgs.NFLAG || "";

            // if (NFlAG !== "X") {
            //     this.onClearSelection();
            // }

        },

      
    });
});
