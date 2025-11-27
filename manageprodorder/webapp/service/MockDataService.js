sap.ui.define([], function () {
    "use strict";

    /**
     * MockDataService - Provides mock data only for Digital Signature application
     * Simulates backend REST API calls with local data
     */
    var MockDataService = {
        /**
         * Main entry point for mock service calls
         * @param {string} endpoint - The endpoint name (e.g., "DIGI_SIGN_LOAD")
         * @param {object} payload - The request payload
         * @returns {Promise} Promise that resolves with mock response data
         */
        call: function (endpoint, payload) {
            return new Promise(function (resolve, reject) {
                // Simulate network delay (300ms)
                setTimeout(function () {
                    try {
                        var response;
                        switch (endpoint) {
                            case "DIGI_SIGN_LOAD":
                                response = MockDataService._getDigiSignLoadResponse(payload);
                                break;
                            case "DIGI_SIGN_SAVE":
                                response = MockDataService._getDigiSignSaveResponse(payload);
                                break;
                            default:
                                reject(new Error("Unknown endpoint: " + endpoint));
                                return;
                        }
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                }, 300);
            });
        },

        /**
         * Mock response for DIGI_SIGN_LOAD endpoint
         * Loads document details for digital signature
         */
        _getDigiSignLoadResponse: function (payload) {
            return {
                MSG: {
                    MSGTY: "S",
                    MSGTX: "Document loaded successfully"
                },
                HEAD: {
                    MBLNR: payload.MBLNR || "5000000001",
                    MJAHR: "2024",
                    BUDAT: "20240122",
                    BLDAT: "20240122",
                    USNAM: "MOCKUSER"
                },
                ITEMS: [
                    {
                        ZEILE: "0001",
                        MATNR: "MAT-001",
                        MAKTX: "Material Description 1",
                        MENGE: "100",
                        MEINS: "PC",
                        LGORT: "SL01",
                        CHARG: "BATCH001"
                    },
                    {
                        ZEILE: "0002",
                        MATNR: "MAT-002",
                        MAKTX: "Material Description 2",
                        MENGE: "50",
                        MEINS: "PC",
                        LGORT: "SL02",
                        CHARG: "BATCH002"
                    }
                ]
            };
        },

        /**
         * Mock response for DIGI_SIGN_SAVE endpoint
         * Saves digital signature
         */
        _getDigiSignSaveResponse: function (payload) {
            return {
                MSG: {
                    MSGTY: "S",
                    MSGTX: "Signature saved successfully"
                },
                MBLNR: payload.MBLNR || "5000000001",
                MJAHR: payload.MJAHR || "2024"
            };
        }
    };

    return MockDataService;
});
