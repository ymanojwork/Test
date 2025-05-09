/**
 * EntitlementRolesModule.js
 * Main module file for the Entitlements and Roles plugin
 */
(function() {
    'use strict';

    // Initialize Angular modules
    angular.module('entitlementRoles.services', []);
    angular.module('entitlementRoles.controllers', ['entitlementRoles.services']);
    angular.module('entitlementRoles.directives', ['entitlementRoles.controllers']);

    // Main module definition
    angular.module('entitlementRoles', [
        'ngRoute',
        'ngSanitize',
        'ui.bootstrap',
        'entitlementRoles.services',
        'entitlementRoles.controllers',
        'entitlementRoles.directives'
    ])
    .config(moduleConfig)
    .run(moduleRun);

    // Module configuration
    moduleConfig.$inject = ['$routeProvider'];
    function moduleConfig($routeProvider) {
        // Define routes if needed
    }

    // Module initialization
    moduleRun.$inject = ['$rootScope', 'EntitlementRolesService'];
    function moduleRun($rootScope, EntitlementRolesService) {
        // Initialization code
    }

    // Entitlement Roles Service
    angular.module('entitlementRoles.services')
        .factory('EntitlementRolesService', EntitlementRolesService);

    EntitlementRolesService.$inject = ['$http', '$q'];
    function EntitlementRolesService($http, $q) {
        var service = {
            getOwnedEntitlements: getOwnedEntitlements,
            getOwnedRoles: getOwnedRoles,
            getOwnedItems: getOwnedItems,
            getEntitlementDetails: getEntitlementDetails,
            getRoleDetails: getRoleDetails,
            getItemDetails: getItemDetails
        };

        return service;

        /**
         * Gets entitlements owned by the current user
         * @param {string} searchTerm - Optional search term to filter results
         * @param {number} limit - Maximum number of results to return
         * @param {number} offset - Pagination offset
         * @returns {Promise} - Promise that resolves with entitlements
         */
        function getOwnedEntitlements(searchTerm, limit, offset) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/owned-entitlements';
            var params = {
                searchTerm: searchTerm || '',
                limit: limit || 25,
                offset: offset || 0
            };

            return $http.get(url, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching owned entitlements:', error);
                    return $q.reject(error);
                });
        }

        /**
         * Gets roles owned by the current user
         * @param {string} searchTerm - Optional search term to filter results
         * @param {number} limit - Maximum number of results to return
         * @param {number} offset - Pagination offset
         * @returns {Promise} - Promise that resolves with roles
         */
        function getOwnedRoles(searchTerm, limit, offset) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/owned-roles';
            var params = {
                searchTerm: searchTerm || '',
                limit: limit || 25,
                offset: offset || 0
            };

            return $http.get(url, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching owned roles:', error);
                    return $q.reject(error);
                });
        }

        /**
         * Gets all owned items (both entitlements and roles)
         * @param {string} searchTerm - Optional search term to filter results
         * @param {number} limit - Maximum number of results to return
         * @param {number} offset - Pagination offset
         * @returns {Promise} - Promise that resolves with all owned items
         */
        function getOwnedItems(searchTerm, limit, offset) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/owned-items';
            var params = {
                searchTerm: searchTerm || '',
                limit: limit || 25,
                offset: offset || 0
            };

            return $http.get(url, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching owned items:', error);
                    return $q.reject(error);
                });
        }

        /**
         * Gets details for a specific entitlement
         * @param {string} entitlementId - ID of the entitlement to retrieve
         * @returns {Promise} - Promise that resolves with entitlement details
         */
        function getEntitlementDetails(entitlementId) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/entitlements/' + entitlementId;

            return $http.get(url)
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching entitlement details:', error);
                    return $q.reject(error);
                });
        }

        /**
         * Gets details for a specific role
         * @param {string} roleId - ID of the role to retrieve
         * @returns {Promise} - Promise that resolves with role details
         */
        function getRoleDetails(roleId) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/roles/' + roleId;

            return $http.get(url)
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching role details:', error);
                    return $q.reject(error);
                });
        }

        /**
         * Gets details for a specific item (entitlement or role)
         * @param {string} itemId - ID of the item to retrieve
         * @param {string} type - Type of item (ENTITLEMENT or ROLE)
         * @returns {Promise} - Promise that resolves with item details
         */
        function getItemDetails(itemId, type) {
            var url = SailPoint.CONTEXT_PATH + '/plugin/rest/entitlement-roles/items/' + itemId;
            var params = {
                type: type || 'ENTITLEMENT'
            };

            return $http.get(url, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(function(error) {
                    console.error('Error fetching item details:', error);
                    return $q.reject(error);
                });
        }
    }

    // EntitlementRolesController
    angular.module('entitlementRoles.controllers')
        .controller('EntitlementRolesController', EntitlementRolesController);

    EntitlementRolesController.$inject = ['$scope', 'EntitlementRolesService'];
    function EntitlementRolesController($scope, EntitlementRolesService) {
        var vm = this;
        
        // Properties
        vm.items = [];
        vm.selectedItem = null;
        vm.loading = false;
        vm.error = null;
        
        // Pagination
        vm.currentPage = 1;
        vm.itemsPerPage = 10;
        vm.totalItems = 0;
        
        // Search
        vm.searchText = '';
        
        // Display options
        vm.showEntitlements = true;
        vm.showRoles = true;
        
        // Methods
        vm.loadItems = loadItems;
        vm.showItemDetails = showItemDetails;
        vm.searchItems = searchItems;
        vm.changePage = changePage;
        vm.filterByType = filterByType;
        
        // Initialize
        initialize();
        
        /**
         * Initializes the controller
         */
        function initialize() {
            loadItems();
        }
        
        /**
         * Loads items (entitlements and/or roles) from the service
         */
        function loadItems() {
            vm.loading = true;
            vm.error = null;
            
            var offset = (vm.currentPage - 1) * vm.itemsPerPage;
            
            // Determine which API to use based on filter settings
            var apiCall;
            if (vm.showEntitlements && vm.showRoles) {
                apiCall = EntitlementRolesService.getOwnedItems(vm.searchText, vm.itemsPerPage, offset);
            } else if (vm.showEntitlements) {
                apiCall = EntitlementRolesService.getOwnedEntitlements(vm.searchText, vm.itemsPerPage, offset);
            } else if (vm.showRoles) {
                apiCall = EntitlementRolesService.getOwnedRoles(vm.searchText, vm.itemsPerPage, offset);
            } else {
                // If nothing is selected to show, just return empty array
                vm.items = [];
                vm.loading = false;
                return;
            }
            
            apiCall.then(function(data) {
                    vm.items = data;
                    vm.totalItems = data.length > 0 ? (offset + data.length + (data.length === vm.itemsPerPage ? 1 : 0)) : 0;
                    vm.loading = false;
                })
                .catch(function(error) {
                    vm.error = 'Failed to load items: ' + (error.message || 'Unknown error');
                    vm.loading = false;
                });
        }
        
        /**
         * Shows or hides details for a specific item
         * @param {Object} item - Item to show details for
         */
        function showItemDetails(item) {
            if (!item || !item.id) {
                return;
            }
            
            // If already selected, toggle off (collapse)
            if (vm.selectedItem && vm.selectedItem.id === item.id) {
                vm.selectedItem = null;
                return;
            }
            
            // Show loading state
            vm.loading = true;
            
            // Determine which API to use based on item type
            var apiCall;
            if (item.ownershipType === 'ENTITLEMENT') {
                apiCall = EntitlementRolesService.getEntitlementDetails(item.id);
            } else if (item.ownershipType === 'ROLE') {
                apiCall = EntitlementRolesService.getRoleDetails(item.id);
            } else {
                apiCall = EntitlementRolesService.getItemDetails(item.id, item.ownershipType);
            }
            
            // Fetch full details from the API
            apiCall.then(function(data) {
                    vm.selectedItem = data;
                    vm.loading = false;
                })
                .catch(function(error) {
                    vm.error = 'Failed to load item details: ' + (error.message || 'Unknown error');
                    vm.loading = false;
                });
        }
        
        /**
         * Searches items based on search text
         */
        function searchItems() {
            vm.currentPage = 1;
            loadItems();
        }
        
        /**
         * Changes the current page
         * @param {number} page - Page number to change to
         */
        function changePage(page) {
            vm.currentPage = page;
            loadItems();
        }
        
        /**
         * Filters items by type
         * @param {string} type - Type to filter by ('entitlement', 'role', or 'all')
         */
        function filterByType(type) {
            switch (type) {
                case 'entitlement':
                    vm.showEntitlements = true;
                    vm.showRoles = false;
                    break;
                case 'role':
                    vm.showEntitlements = false;
                    vm.showRoles = true;
                    break;
                case 'all':
                default:
                    vm.showEntitlements = true;
                    vm.showRoles = true;
                    break;
            }
            
            vm.currentPage = 1;
            loadItems();
        }
    }

    // EntitlementRolesWidget Directive
    angular.module('entitlementRoles.directives')
        .directive('entitlementRolesWidget', entitlementRolesWidget);

    entitlementRolesWidget.$inject = [];
    function entitlementRolesWidget() {
        return {
            restrict: 'E',
            templateUrl: SailPoint.CONTEXT_PATH + '/plugin/entitlementRoles/widget.html',
            controller: 'EntitlementRolesController',
            controllerAs: 'vm',
            scope: {
                config: '='
            },
            link: function(scope, element, attrs) {
                // Custom directive behavior
            }
        };
    }
})();