sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.DigitalSignatureDisplay", {
        onInit: function () {
            // Canvas and signature setup
            this._canvas = null;
            this._ctx = null;
            this._isDrawing = false;
            this._lastX = 0;
            this._lastY = 0;

            // Attach route matched event
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("DigitalSignatureDisplay").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Get data from component model
            var oComponentModel = this.getOwnerComponent().getModel("digitalSignature");
            if (!oComponentModel || !oComponentModel.getProperty("/MBLNR")) {
                // If no data, navigate back to search
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("DigitalSignature");
                return;
            }

            // Set the component model to the view
            this.getView().setModel(oComponentModel, "digitalSignature");

            // Initialize employee fields if not already set
            if (!oComponentModel.getProperty("/employeeNumber")) {
                oComponentModel.setProperty("/employeeNumber", "12345");
                oComponentModel.setProperty("/employeeEmail", "john.doe@example.com");
                oComponentModel.setProperty("/printOutput", true);
            }
            
            // Set dummy MBLNR if not present
            if (!oComponentModel.getProperty("/MBLNR")) {
                oComponentModel.setProperty("/MBLNR", "5000000123");
            }
            
            // Set dummy MJAHR if not present
            if (!oComponentModel.getProperty("/MJAHR")) {
                oComponentModel.setProperty("/MJAHR", "2025");
            }

            // Initialize canvas after view is rendered
            setTimeout(() => {
                this._initializeCanvas();
            }, 100);
        },

        onEmployeeNumberChange: function (oEvent) {
            var sEmployeeNumber = oEvent.getParameter("value");
            var that = this;

            if (!sEmployeeNumber) {
                this.getView().getModel("digitalSignature").setProperty("/employeeEmail", "");
                return;
            }

            // Show busy indicator
            this.getView().setBusy(true);

            // Validate employee number against USR01 table
            var oPayload = {
                PERNR: sEmployeeNumber
            };

            MockDataService.call("VALIDATE_EMPLOYEE", oPayload).then(function (oResponse) {
                that.getView().setBusy(false);

                if (oResponse && oResponse.MSG) {
                    if (oResponse.MSG.MSGTY === "S") {
                        // Employee found - populate email
                        var sEmail = oResponse.EMAIL || "";
                        that.getView().getModel("digitalSignature").setProperty("/employeeEmail", sEmail);
                    } else if (oResponse.MSG.MSGTY === "E") {
                        // Employee not found
                        var oBundle = that.getOwnerComponent().getModel("i18n").getResourceBundle();
                        MessageBox.error(oBundle.getText("employeeNumberNotExist") || "Employee Number does not exist");
                        that.getView().getModel("digitalSignature").setProperty("/employeeNumber", "");
                        that.getView().getModel("digitalSignature").setProperty("/employeeEmail", "");
                        oEvent.getSource().setValue("");
                    }
                } else {
                    // Mock response - set a dummy email
                    that.getView().getModel("digitalSignature").setProperty("/employeeEmail", sEmployeeNumber + "@example.com");
                }
            }).catch(function (error) {
                that.getView().setBusy(false);
                // On error, set a dummy email for development
                that.getView().getModel("digitalSignature").setProperty("/employeeEmail", sEmployeeNumber + "@example.com");
            });
        },

        _initializeCanvas: function () {
            // Try multiple ways to get the canvas element
            var canvas = document.getElementById("displaySignatureCanvas");
            
            if (!canvas) {
                // Try getting it from the DOM directly
                canvas = document.querySelector("canvas");
            }
            
            if (!canvas) {
                console.error("Canvas element not found - canvas:", canvas);
                setTimeout(() => {
                    this._initializeCanvas();
                }, 500);
                return;
            }

            console.log("Canvas found:", canvas);
            this._canvas = canvas;
            this._ctx = canvas.getContext("2d");
            
            // Set canvas size to match display size (important for proper drawing)
            var rect = canvas.getBoundingClientRect();
            // Set the actual canvas resolution
            canvas.width = rect.width || 800;
            canvas.height = rect.height || 300;
            
            console.log("Canvas initialized - width:", canvas.width, "height:", canvas.height);
            
            // Drawing settings
            this._ctx.strokeStyle = "#000";
            this._ctx.lineWidth = 2;
            this._ctx.lineCap = "round";
            this._ctx.lineJoin = "round";

            // Clear canvas
            this._ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Bind event handlers
            this._handleStart = this._onStart.bind(this);
            this._handleMove = this._onMove.bind(this);
            this._handleEnd = this._onEnd.bind(this);

            // Add event listeners
            canvas.addEventListener("mousedown", this._handleStart, false);
            canvas.addEventListener("mousemove", this._handleMove, false);
            canvas.addEventListener("mouseup", this._handleEnd, false);
            canvas.addEventListener("mouseleave", this._handleEnd, false);

            canvas.addEventListener("touchstart", this._handleStart, false);
            canvas.addEventListener("touchmove", this._handleMove, false);
            canvas.addEventListener("touchend", this._handleEnd, false);
            canvas.addEventListener("touchcancel", this._handleEnd, false);
            
            console.log("Event listeners attached successfully");
        },

        _onStart: function (e) {
            e.preventDefault();
            this._isDrawing = true;
            
            var coords = this._getCoordinates(e);
            this._lastX = coords.x;
            this._lastY = coords.y;
            
            console.log("Drawing started at:", coords.x, coords.y);
        },

        _onMove: function (e) {
            if (!this._isDrawing) return;
            e.preventDefault();

            var coords = this._getCoordinates(e);
            
            this._ctx.beginPath();
            this._ctx.moveTo(this._lastX, this._lastY);
            this._ctx.lineTo(coords.x, coords.y);
            this._ctx.stroke();

            this._lastX = coords.x;
            this._lastY = coords.y;
        },

        _onEnd: function (e) {
            if (e) {
                e.preventDefault();
            }
            this._isDrawing = false;
        },

        _getCoordinates: function (e) {
            var rect = this._canvas.getBoundingClientRect();
            var clientX, clientY;

            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        },

        onClearSignature: function () {
            if (this._ctx && this._canvas) {
                this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            }
        },

        onSave: function () {
            var oModel = this.getView().getModel("digitalSignature");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            // Validate employee number
            var sEmployeeNumber = oModel.getProperty("/employeeNumber");
            if (!sEmployeeNumber) {
                MessageBox.error("Employee Number is mandatory");
                return;
            }

            // Check if signature is empty
            if (!this._canvas || this._isCanvasBlank()) {
                MessageBox.error(oBundle.getText("signatureRequired") || "Please provide your signature before saving");
                return;
            }

            // Validate employee email if "Send by Email" would be selected
            // For now, we'll just check if print output requires validation
            var bPrintOutput = oModel.getProperty("/printOutput");

            var that = this;

            // Show busy indicator
            this.getView().setBusy(true);

            // Convert canvas to Blob
            this._canvas.toBlob(function(blob) {
                // Convert Blob to base64 for sending in JSON
                var reader = new FileReader();
                reader.onloadend = function() {
                    var base64data = reader.result;
                    
                    // Get all material documents
                    var aDocuments = oModel.getProperty("/DOCUMENTS") || [];
                    
                    var oPayload = {
                        DATA: {
                            IT_MBLNR: aDocuments
                        },
                        ITEM: [],
                        HEAD: {
                            PERNR: sEmployeeNumber,
                            EMAIL: oModel.getProperty("/employeeEmail") || "",
                            SIGN: base64data,
                            PRINT: bPrintOutput ? "X" : ""
                        },
                        MSG : {}
                    };

                    var baseUrl = that.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri;
                    var url = "SIGN_3_SAVE";
                    
                    $.ajax({
                        url: baseUrl + url,
                        type: "POST",
                        contentType: "application/json; charset=utf-8",
                        data: JSON.stringify(oPayload),
                        success: function (oResponse) {
                            that.getView().setBusy(false);
                            
                            console.log("Save response:", oResponse);
                            
                            // Store saved document data before any navigation
                            var oSavedDocModel = new sap.ui.model.json.JSONModel(oModel.getData());
                            that.getOwnerComponent().setModel(oSavedDocModel, "savedDocument");
                            
                            // Get router
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);

                            if (oResponse && oResponse.MSG) {
                                var sMessageType = oResponse.MSG.MSGTY;
                                var sMessageText = oResponse.MSG.MSGTX || "";
                                
                                if (sMessageType === "S") {
                                    // Success - navigate immediately
                                    MessageBox.success(sMessageText || "Signature saved successfully");
                                    oRouter.navTo("DigitalSignatureSign");
                                } else if (sMessageType === "E") {
                                    // Error message
                                    MessageBox.error(sMessageText || "Error saving signature");
                                } else if (sMessageType === "W") {
                                    // Warning message - still navigate
                                    MessageBox.warning(sMessageText || "Warning while saving signature");
                                    oRouter.navTo("DigitalSignatureSign");
                                } else if (sMessageType === "I") {
                                    // Information message - still navigate
                                    MessageBox.information(sMessageText || "Information");
                                    oRouter.navTo("DigitalSignatureSign");
                                }
                            } else {
                                // No MSG in response - navigate directly
                                MessageBox.success("Signature saved successfully");
                                oRouter.navTo("DigitalSignatureSign");
                            }
                        },
                        error: function (xhr, status, error) {
                            that.getView().setBusy(false);
                            MessageBox.error("Failed to save signature: " + (error || status));
                        }
                    });
                };
                reader.readAsDataURL(blob);
            }, "image/png");
        },

        _isCanvasBlank: function () {
            if (!this._canvas) return true;
            
            var blank = document.createElement("canvas");
            blank.width = this._canvas.width;
            blank.height = this._canvas.height;
            
            return this._canvas.toDataURL() === blank.toDataURL();
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("DigitalSignature", {}, true);
        },

        onExit: function () {
            // Clean up event listeners
            if (this._canvas) {
                this._canvas.removeEventListener("mousedown", this._handleStart);
                this._canvas.removeEventListener("mousemove", this._handleMove);
                this._canvas.removeEventListener("mouseup", this._handleEnd);
                this._canvas.removeEventListener("mouseleave", this._handleEnd);
                this._canvas.removeEventListener("touchstart", this._handleStart);
                this._canvas.removeEventListener("touchmove", this._handleMove);
                this._canvas.removeEventListener("touchend", this._handleEnd);
                this._canvas.removeEventListener("touchcancel", this._handleEnd);
            }
        }
    });
});
