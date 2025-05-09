/**
 * AbstractListController provides a base controller with common list functionality
 * such as pagination, searching, and sorting.
 */
(function() {
    'use strict';

    angular.module('entitlementOwnership.controllers')
        .controller('AbstractListController', AbstractListController);

    AbstractListController.$inject = ['$scope', '$filter', '$timeout'];

    function AbstractListController($scope, $filter, $timeout) {
        var vm = this;

        // Pagination settings
        vm.itemsPerPage = 10;
        vm.currentPage = 1;
        vm.totalItems = 0;
        
        // Search functionality
        vm.searchText = '';
        vm.searchDebounceTime = 300;
        vm.searchTimer = null;
        
        // Sorting
        vm.sortColumn = 'displayName';
        vm.sortReverse = false;
        
        // Data
        vm.allItems = [];
        vm.displayedItems = [];
        vm.filteredItems = [];
        vm.loading = false;
        
        // Methods
        vm.search = search;
        vm.searchWithDebounce = searchWithDebounce;
        vm.sort = sort;
        vm.changePage = changePage;
        vm.refreshList = refreshList;
        vm.getItems = getItems;  // Should be overridden by child controllers
        
        // Initialize
        initialize();
        
        /**
         * Initializes the controller
         */
        function initialize() {
            $scope.$watch('vm.searchText', function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    vm.searchWithDebounce(newValue);
                }
            });
        }
        
        /**
         * Performs search with debounce to avoid excessive API calls
         * @param {string} searchText - Text to search for
         */
        function searchWithDebounce(searchText) {
            if (vm.searchTimer) {
                $timeout.cancel(vm.searchTimer);
            }
            
            vm.searchTimer = $timeout(function() {
                vm.search(searchText);
            }, vm.searchDebounceTime);
        }
        
        /**
         * Performs the search
         * @param {string} searchText - Text to search for
         */
        function search(searchText) {
            vm.loading = true;
            vm.currentPage = 1;
            
            // This should call the API or filter locally based on implementation
            // Child controllers should override this method
            vm.getItems(searchText).then(function(response) {
                vm.loading = false;
            }).catch(function(error) {
                vm.loading = false;
                console.error('Error searching items:', error);
            });
        }
        
        /**
         * Handles sorting
         * @param {string} column - Column to sort by
         */
        function sort(column) {
            if (vm.sortColumn === column) {
                vm.sortReverse = !vm.sortReverse;
            } else {
                vm.sortColumn = column;
                vm.sortReverse = false;
            }
            
            refreshList();
        }
        
        /**
         * Changes the current page
         * @param {number} page - Page number to change to
         */
        function changePage(page) {
            vm.currentPage = page;
            refreshList();
        }
        
        /**
         * Refreshes the displayed items list
         */
        function refreshList() {
            if (vm.allItems.length > 0) {
                // Apply sort
                var sortedItems = $filter('orderBy')(vm.filteredItems, vm.sortColumn, vm.sortReverse);
                
                // Apply pagination
                var startIndex = (vm.currentPage - 1) * vm.itemsPerPage;
                vm.displayedItems = sortedItems.slice(startIndex, startIndex + vm.itemsPerPage);
            } else {
                vm.displayedItems = [];
            }
        }
        
        /**
         * Gets items from the backend API
         * This is a placeholder that should be overridden by child controllers
         * @param {string} searchText - Optional search text
         * @returns {Promise} - Promise that resolves with items
         */
        function getItems(searchText) {
            // To be implemented by child classes
            return Promise.resolve([]);
        }
    }
})();