sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";
    return Controller.extend("com.merkavim.ewm.manageprodorder.controller.DocumentCreated", {
        onInit: function () {
            var oComponent = this.getOwnerComponent();

            // attach route matched to ensure binding (handles timing issues)
            try {
                var oRouter = oComponent.getRouter();
                if (oRouter && oRouter.getRoute("DocumentCreated")) {
                    var that = this;
                    oRouter.getRoute("DocumentCreated").attachPatternMatched(function () {
                        that._ensureCreatedModel();
                    });
                } else {
                    this._ensureCreatedModel();
                }
            } catch (e) {
                this._ensureCreatedModel();
            }
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // Navigate back to start page (View1) for a fresh flow
            oRouter.navTo("RouteView1");
        },
        
        onNavHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteView1");
        },

        _ensureCreatedModel: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oCreatedModel = oComponent.getModel("created");
            console.log("[DocumentCreated] component created model:", oCreatedModel && oCreatedModel.getData ? oCreatedModel.getData() : oCreatedModel);
            if (oCreatedModel) {
                if (!oView.getModel("created")) {
                    oView.setModel(oCreatedModel, "created");
                    console.log("[DocumentCreated] created model set on view");
                }
                var oTable = this.byId("createdItemsTable");
                if (oTable) {
                    var oTableModel = oTable.getModel("created");
                    console.log("[DocumentCreated] createdItemsTable model before set:", oTableModel && oTableModel.getData ? oTableModel.getData() : oTableModel);
                    if (!oTableModel) {
                        oTable.setModel(oCreatedModel, "created");
                        console.log("[DocumentCreated] created model set on table");
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) { try { oBinding.refresh(); console.log("[DocumentCreated] table items binding refreshed"); } catch (e) { } }
                    }
                    try {
                        var aRenderedItems = oTable.getItems && oTable.getItems();
                        console.log("[DocumentCreated] createdItemsTable.getItems() -> length:", aRenderedItems && aRenderedItems.length);
                        var oItemsBinding = oTable.getBinding("items");
                        if (oItemsBinding) {
                            var iContextsCount = 0;
                            if (oItemsBinding && oItemsBinding.getContexts) {
                                try { iContextsCount = oItemsBinding.getContexts(0, 100).length; } catch (e) { iContextsCount = 0; }
                            } else if (oItemsBinding && oItemsBinding.getLength) {
                                try { iContextsCount = oItemsBinding.getLength(); } catch (e) { iContextsCount = 0; }
                            }
                            var iModelItemsCount = 0;
                            try { var aModelItems = oCreatedModel && oCreatedModel.getProperty && oCreatedModel.getProperty('/items'); iModelItemsCount = Array.isArray(aModelItems) ? aModelItems.length : 0; } catch (e) { iModelItemsCount = 0; }
                            console.log("[DocumentCreated] items binding contexts/length:", iContextsCount, "model items:", iModelItemsCount);
                            if ((aRenderedItems ? aRenderedItems.length : 0) === 0 && (iContextsCount > 0 || iModelItemsCount > 0)) {
                                console.log("[DocumentCreated] Binding has contexts or model items but no rendered items — attempting retries and forcing rebind if needed");
                                try { oCreatedModel.refresh && oCreatedModel.refresh(true); } catch (e) { }
                                try { oItemsBinding.refresh && oItemsBinding.refresh(); } catch (e) { }
                                try { oTable.invalidate && oTable.invalidate(); oTable.rerender && oTable.rerender(); } catch (e) { }

                                var iAttempts = 0;
                                var fnRetry = function () {
                                    iAttempts++;
                                    var aNowRendered = oTable.getItems && oTable.getItems();
                                    if (aNowRendered && aNowRendered.length > 0) {
                                        console.log("[DocumentCreated] Items rendered after retry, attempts:", iAttempts);
                                        return;
                                    }
                                    if (iAttempts <= 3) {
                                        try { oTable.unbindItems(); } catch (e) { }
                                        try { oTable.bindItems({ path: "created>/items", template: oTemplate || null }); } catch (e) { }
                                        setTimeout(fnRetry, 100);
                                        return;
                                    }
                                    console.log("[DocumentCreated] retries exhausted — proceeding to rebind fallbacks");
                                };
                                setTimeout(fnRetry, 100);

                                try {
                                    var oTemplate = this.byId("cliCreatedItem");
                                    if (oTemplate) {
                                        console.log("[DocumentCreated] rebinding createdItemsTable using template cliCreatedItem (clone)");
                                        oTable.unbindItems();
                                        var bBound = false;
                                        try {
                                            var oClonedTemplate = oTemplate.clone();
                                            oTable.bindItems({ path: "created>/items", template: oClonedTemplate });
                                            bBound = true;
                                        } catch (e) {
                                            console.warn("[DocumentCreated] cloning template failed, falling back to original template", e);
                                            try { oTable.bindItems({ path: "created>/items", template: oTemplate }); bBound = true; } catch (e2) { console.warn("[DocumentCreated] binding with original template failed:", e2); }
                                        }

                                        if (!bBound) {
                                            try {
                                                var ColumnListItem = sap.m.ColumnListItem;
                                                if (!ColumnListItem) { console.warn("[DocumentCreated] sap.m.ColumnListItem not available"); }
                                                var oProgTemplate = new ColumnListItem({
                                                    cells: [
                                                        new sap.m.Text({ text: "{created>DocumentNumber}" })
                                                    ]
                                                });
                                                oTable.unbindItems();
                                                oTable.bindItems({ path: "created>/items", template: oProgTemplate });
                                                console.log("[DocumentCreated] programmatic rebind attempted (template fallback)");
                                            } catch (e3) { console.warn("[DocumentCreated] programmatic rebind failed (template fallback):", e3); }
                                        }
                                    } else {
                                        console.warn("[DocumentCreated] cliCreatedItem not found — attempting programmatic rebind");
                                        try {
                                            var ColumnListItem2 = sap.m.ColumnListItem;
                                            if (!ColumnListItem2) { console.warn("[DocumentCreated] sap.m.ColumnListItem not available"); }
                                            var oProgTemplate2 = new ColumnListItem2({
                                                cells: [
                                                    new sap.m.Text({ text: "{created>DocumentNumber}" })
                                                ]
                                            });
                                            oTable.unbindItems();
                                            oTable.bindItems({ path: "created>/items", template: oProgTemplate2 });
                                            console.log("[DocumentCreated] programmatic rebind attempted (no xml template)");
                                        } catch (e4) { console.warn("[DocumentCreated] programmatic rebind failed (no xml template):", e4); }
                                    }
                                } catch (e) { console.warn("[DocumentCreated] rebind fallback failed:", e); }
                            }
                        }
                    } catch (e) { console.warn("[DocumentCreated] diagnostics failed:", e); }
                } else {
                    console.warn("[DocumentCreated] createdItemsTable not found by id");
                }
            } else {
                console.warn("[DocumentCreated] No created model found on component");
            }
        }
    });
});