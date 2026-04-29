sap.ui.define([
    "com/merkavim/ewm/manageprodorder/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/layout/form/SimpleForm",
    "sap/m/MessageToast"
], function (BaseController, MessageBox, SimpleForm, MessageToast) {
    "use strict";
    return BaseController.extend("com.merkavim.ewm.manageprodorder.controller.StockTransferbnSLItems", {
        onInit: function () {
            var that = this;
            // initial toggle (point 3) for mobile cards vs table
            // this.toggleMobileDesktop({ mobile: "iioMobileCardsContainerSL", desktop: "itemsTableSL" });
            // sap.ui.Device.media.attachHandler(function () {
            //     that.toggleMobileDesktop({ mobile: "iioMobileCardsContainerSL", desktop: "itemsTableSL" });
            // });

            // Attach route matched handler to clear remark field
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("StockTransferbnSLItems").attachPatternMatched(this._onRouteMatched, this);
        },
         formatNumber: function (value) {
            if (value) {
                return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else if (value === 0) {
                return "0";
            }

        },

        _onRouteMatched: function () {
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
            this.getOwnerComponent().getRouter().navTo("StockTransferBetweenSL", {}, true);
        },

        onEditItem: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var that = this;
            var oContext = oItem.getBindingContext("SLitems");
            var oModel = oContext.getModel();
            var aItems = oModel.getProperty("/items");
            var iIndex = oContext.getPath().split("/").pop();
            var oData = Object.assign({}, aItems[iIndex]);
            this.editdata = oData;
            this._lastMaterialEntered = oData.MATNR || null;
            this.saveeditflag = "X";

            // Use SimpleForm for better alignment
            var oSimpleForm = new SimpleForm({
                editable: true,
                layout: "ResponsiveGridLayout",
                content: [
                    // new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("internalOrderLabel") }),
                    // new sap.m.Input({ value: oData.AUFNR, showValueHelp:true,submit:this.onEnterPress.bind(this), valueHelpRequest:this.onInternalOrderValueHelp.bind(this),liveChange: function (e) { oData.AUFNR = e.getParameter("value");} }),
                    // Add Cost Center (KOSTL) below AUFNR
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("materialNumber") }),
                    new sap.m.Input({ value: oData.MATNR, showValueHelp: false, submit: this.onEnterPress.bind(this), liveChange: function (e) { oData.MATNR = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("issuingStorageLocationLabel") }),
                    new sap.m.Input({ value: oData.LGORT_F, submit: this.onEnterPress.bind(this), liveChange: function (e) { oData.LGORT_F = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("RecievingStorageLocationLabel") }),
                    new sap.m.Input({ value: oData.LGORT_T, submit: this.onEnterPress.bind(this), liveChange: function (e) { oData.LGORT_T = e.getParameter("value"); } }),
                    new sap.m.Label({ text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("issueQuantityLabelNew") }),
                    new sap.m.Input({ value: oData.PICKING_QTY, submit: this.onEnterPress.bind(this), liveChange: function (e) { oData.PICKING_QTY = e.getParameter("value"); } })
                ]
            });

            var oDialog = new sap.m.Dialog({
                title: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("editItemTitle"),
                content: [oSimpleForm],
                beginButton: new sap.m.Button({
                    text: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("saveLabel"),
                    press: function () {

                        that.onValidateCheck(oData, iIndex, oDialog, aItems);
                        // if(that.saveeditflag === "X"){
                        //     that.updateData(oData,iIndex);
                        //      aItems[iIndex] = oData;
                        //      oModel.setProperty("/items", aItems);
                        //      oDialog.close();
                        // }else{
                        //     MessageBox.error("Please Enter valid data before saving.");
                        // }
                    }
                }),
                endButton: new sap.m.Button({
                    text: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("cancelLabel"),
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });
            oDialog.open();
        },
        onValidateCheck: function (oData, iIndex, oDialog, aItems) {
            var that = this;
            var oView = this.getView();

            var oData = oData;



            // Only clear fields if material changed since last Enter
            var sCurrentMat = (oData.MATNR || "").trim();
            var sLastMat = (this._lastMaterialEntered || "").trim();
            var bMaterialChanged = sCurrentMat !== sLastMat;
            if (sLastMat === "") {
                bMaterialChanged = false;
            }

            oData.LGORT_T = bMaterialChanged ? "" : (oData.LGORT_T || "");
            oData.LGORT_F = bMaterialChanged ? "" : (oData.LGORT_F || "");
            oData.MAKTX = bMaterialChanged ? "" : (oData.MAKTX || "");
            oData.LGPBE = bMaterialChanged ? "" : (oData.LGPBE || "");
            // oData.MEINS = bMaterialChanged ? "" : (oData.MEINS || "");
            oData.LABST = bMaterialChanged ? "" : (oData.LABST || "");
            oData.CHECK = "X";


            // Build payload
            var oPayload = {
                DATA: oData,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {

                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }
                    if (response.DATA.LABST === 0) {
                        response.DATA.LABST = "";
                    }



                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        that.saveeditflag = "";
                        return;
                    }
                    that.saveeditflag = "X";
                    that.updateData(oData, iIndex);
                    that.editdata = response.DATA || response;
                    var oItemsModel = that.getView().getModel("SLitems");
                    var aItems = oItemsModel.getProperty("/items");
                    aItems[iIndex] = that.editdata;
                    oItemsModel.setProperty("/items", aItems);
                    oDialog.close();



                    // Update last material after successful check
                    that._lastMaterialEntered = (that.editdata.MATNR || sCurrentMat || null);


                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        onEnterPress: function (oEvent) {
            console.log("Enter key pressed on screen");
            this.saveeditflag = "";
            var that = this;
            var oView = this.getView();

            var oData = this.editdata;

            var loopdialogdata = oEvent.getSource().getParent().getParent().mAggregations.formElements;



            oData.MATNR = loopdialogdata[0].mAggregations.fields[0].getValue();
            oData.LGORT_F = loopdialogdata[1].mAggregations.fields[0].getValue();
            oData.LGORT_T = loopdialogdata[2].mAggregations.fields[0].getValue();
            // oData.MATNR = loopdialogdata[3].mAggregations.fields[0].getValue();
            oData.PICKING_QTY = loopdialogdata[3].mAggregations.fields[0].getValue();

            // Only clear fields if material changed since last Enter
            var sCurrentMat = (oData.MATNR || "").trim();
            var sLastMat = (this._lastMaterialEntered || "").trim();
            var bMaterialChanged = sCurrentMat !== sLastMat;
             if(sLastMat === ""){
                bMaterialChanged = false;
            }
            
            oData.LGORT_T = bMaterialChanged ? "" : (oData.LGORT_T || "");
            oData.LGORT_F = bMaterialChanged ? "" : (oData.LGORT_F || "");
            oData.MAKTX = bMaterialChanged ? "" : (oData.MAKTX || "");
            oData.LGPBE = bMaterialChanged ? "" : (oData.LGPBE || "");
            // oData.MEINS = bMaterialChanged ? "" : (oData.MEINS || "");
            oData.LABST = bMaterialChanged ? "" : (oData.LABST || "");
            oData.CHECK = "";
            // Build payload
            var oPayload = {
                DATA: oData,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };

            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_1_CHECK";
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(oPayload),
                success: function (response) {

                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }
                     if (response.DATA.LABST === 0) {
                        response.DATA.LABST = "";
                    }


                    that.editdata = response.DATA || response;

                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        that.saveeditflag = "";
                        return;
                    }
                    that.saveeditflag = "X";

                    // Update last material after successful check
                    that._lastMaterialEntered = (that.editdata.MATNR || sCurrentMat || null);

                    sap.m.MessageToast.show("Data updated from server.");
                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Failed to fetch data on Enter.");
                }
            });
        },
        updateData: function (oData, iIndex) {
            var oItemsModel = this.getView().getModel("SLitems");
            var aItems = oItemsModel.getProperty("/items");
            var that = this;
            var baseUrl = this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
            var url = "STOCK_1_CHECK";
            var oPayload = {
                DATA: this.editdata,
                MSG: {
                    MSGTX: "",
                    MSGTY: ""
                }
            };
            $.ajax({
                url: baseUrl + url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: function (response) {
                    // Check for error indicator 'E' in SAP message structure
                    if (response && response.MSG && response.MSG.MSGTY === "E") {
                        MessageBox.error(response.MSG.MSGTX || "Error occurred");
                        return;
                    }
                    if (response.DATA.PICKING_QTY === 0) {
                        response.DATA.PICKING_QTY = "";
                    }
                    if (response.DATA.LABST === 0) {
                        response.DATA.LABST = "";
                    }

                    var aItems = oItemsModel.getProperty("/items");
                    aItems[iIndex] = response.DATA;
                    oItemsModel.setProperty("/items", aItems);
                    MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("itemUpdatedSuccess"));


                },
                error: function (xhr, status, error) {
                    MessageBox.error("Failed to check item before adding");
                }
            });

        },



        onDeleteItem: function (oEvent) {


            var that = this;
            var oItem = oEvent.getSource().getParent();
            var oContext = oItem.getBindingContext("SLitems");
            var oModel = oContext.getModel();
            var aItems = oModel.getProperty("/items");
            var iIndex = oContext.getPath().split("/").pop();
            // aItems.splice(iIndex, 1);
            // oModel.setProperty("/items", aItems);

            MessageBox.warning(
                that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("itemDeleteWarningTitle"), {
                actions: [that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"), MessageBox.Action.CANCEL],
                emphasizedAction: that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm"),
                onClose: function (sAction) {
                    if (sAction === that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Confirm")) {
                        // User confirmed deletion
                        aItems.splice(iIndex, 1);
                        oModel.setProperty("/items", aItems);
                    } else {
                        // User cancelled deletion, do nothing
                        return;
                    }
                }
            });
        },

        /**
         * Open sort dialog
         */
        onOpenSortDialog: function () {
            var oDlg = this.byId("iioSortDialogSL");
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

                var oTable = this.byId("mobileCarrtdIrRList");
                if (oTable) {
                    var oTableBinding = oTable.getBinding("items");
                    if (oTableBinding && oTableBinding.sort) {
                        oTableBinding.sort(oSorter);
                    }
                }

                var oList = this.byId("iioMobileCardListSL");
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
        onSort: function (oEvent) {
            var sPath = oEvent.getParameter("column").getSortProperty();
            var bDescending = oEvent.getParameter("sortOrder") === "Descending";
            var oTable = this.byId("itemsTableSL");
            var oBinding = oTable.getBinding("items");
            var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
            oBinding.sort(oSorter);
        },
   onPressBatchSerial: function (oEvent) {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // var HeadData = this.getOwnerComponent().getModel("PickForCartMainModel").getProperty("/HEAD");
            var HeadData = Object.assign({}, oEvent.getSource().getBindingContext("SLitems").getObject());
            // var HeadData = oEvent.getSource().getBindingContext("SLitems").getObject();
            var Spath = oEvent.getSource().getBindingContext("SLitems").getPath();
            this.getOwnerComponent().getModel("GlobalVariable").setProperty('/Spath', Spath);
            HeadData.LGORT = oEvent.getSource().getBindingContext("SLitems").getObject().LGORT_T;
            if (HeadData.XCHPF !== '') {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Batch", {
                    HeadData: HeadData,
                    View: "StockTransferbnSLItems"
                    // Path:Spath
                }, true);
            } else {
                HeadData = JSON.stringify(HeadData);
                HeadData = encodeURIComponent(HeadData);
                oRouter.navTo("Serial", {
                    HeadData: HeadData,
                    View: "StockTransferbnSLItems"
                    // Path:Spath
                }, true);
            }
        },
        onContinue: function () {
            var oViewModel = this.getOwnerComponent().getModel("view");
            var oItemsModel = this.getView().getModel("SLitems");
            var oGlobalWerksModel = this.getOwnerComponent().getModel("globalWerks");
            var oData = oViewModel ? oViewModel.getData() : {};
            var that = this;
            var newArray = [];
            // Header text from first item
            var aCurrentItems = oItemsModel ? (oItemsModel.getProperty("/items") || []) : [];
             var copyaSelected = [...aCurrentItems];
              copyaSelected.forEach(function (it) {
                // ensure picking qty is not empty/undefined (can happen if user selected but did not enter a value)
                if (it.PICKING_QTY === undefined || it.PICKING_QTY === null || it.PICKING_QTY === "") {
                    it.PICKING_QTY = 0;
                }
               
                if (it.XCHPF === 'X') {
                    if (it.BATCHDATA) {
                        var copyObject = JSON.parse(JSON.stringify(it))
                        for (var t = 0; t < it.BATCHDATA.length; t++) {
                            copyObject.CHARG = it.BATCHDATA[t] ? it.BATCHDATA[t].CHARG : "";
                            copyObject.PICKING_QTY = it.BATCHDATA[t] ? it.BATCHDATA[t].MENGE : "";
                            delete copyObject.BATCHDATA;
                            newArray.push({ ...copyObject});
                        }
                    } else {
                        newArray.push(it);
                    }
                    // delete it.BATCHDATA;
                }
                if (it.SERNP !== '') {
                    if (it.SERNRDATA) {
                        var copyObject = JSON.parse(JSON.stringify(it))
                        for (var t = 0; t < it.PICKING_QTY; t++) {
                            copyObject.SERNR = it.SERNRDATA[t] ? it.SERNRDATA[t].SERNR : "";
                            copyObject.PICKING_QTY = 1;
                            delete copyObject.SERNRDATA;
                            newArray.push({ ...copyObject});
                        }
                    } else {
                        newArray.push(it);
                    }
                    // delete it.SERNRDATA;
                }
                if (it.XCHPF === '' && it.SERNP === '') {
                    newArray.push(it);
                }


            });
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
            var url = "STOCK_2_SAVE";

            // Build payload with dynamic CHECK flag
            var buildPayload = function (sCheckFlag) {
                return {
                    DATA: oData,
                    ITEM: newArray,
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
                    that.getView().getModel("SLitems").setProperty("/items", []); // Clear items
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
