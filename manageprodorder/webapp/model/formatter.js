sap.ui.define([], function() {
    "use strict";
    return {
        /**
         * Returns true if device is phone (for mobile-only columns)
         */
        isPhoneVisible: function(bIsPhone) {
            return !!bIsPhone;
        },

        /**
         * Returns true if device is NOT phone (for desktop/tablet columns)
         */
        isNotPhoneVisible: function(bIsPhone) {
            return !bIsPhone;
        },
        /**
         * Converts yyyy-mm-dd to dd/mm/yyyy
         * @param {string} sDate - Date string in yyyy-mm-dd format
         * @returns {string} Date string in dd/mm/yyyy format
         */
        bdterToDDMMYYYY: function(sDate) {
            if (!sDate) return "";
            var parts = sDate.split("-");
            if (parts.length !== 3) return sDate;
            return parts[2] + "/" + parts[1] + "/" + parts[0];
        },

        /**
         * Converts yyyy-mm-dd to dd/mm/yy
         * @param {string} sDate - Date string in yyyy-mm-dd format
         * @returns {string} Date string in dd/mm/yy format
         */
        bdterToDDMMYY: function(sDate) {
            if (!sDate) return "";
            var parts = sDate.split("-");
            if (parts.length !== 3) return sDate;
            var year = parts[0].slice(-2);
            return parts[2] + "/" + parts[1] + "/" + year;
        }
    };
});
