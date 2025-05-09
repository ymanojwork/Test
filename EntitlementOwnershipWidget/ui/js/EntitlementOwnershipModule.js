(function() {
    'use strict';
        
    /**
     * This is injected as a controller for the widget directive toward the bottom
     */
    function EntitlementOwnershipCtrl(SearchData, PageState, PagingData, $q, $timeout, configService, EntitlementOwnershipService, navigationService, ListResultDTO, ListResultCache, $window, $injector) {
        let me = this, 
        // The number of items to load into the cache at once.
        CACHE_CHUNK_SIZE = 40, 
        // The search term used the list time the data was loaded.
        lastSearchTerm, 
      
        // Flag indicating that we are fetching results to go to the previous page.
        fetchForPreviousPage = false, 
        // A timeout promise that will refresh the list results after going to the previous page.
        previousPageRefreshPromise;
       
        me.cache = new ListResultCache();
            
        // This invokes the superclass constructor
        EntitlementOwnershipCtrl._super.call(this, SearchData, $q, $timeout, configService, new PageState(new PagingData(10)));
      
        // AbstractListCtrl methods
        /**
         * Return the requested items from the cache wrapped in a promise.
         *
         * @param {Number} startIdx  The start index to retrieve.
         * @param (Number) numItems  The number of items to retrieve.
         *
         * @return {Promise<ListResultDTO>} A promise that resolves with a ListResultDTO with the
         *     requested items, or null if the cache does not contain these items.
         */
        function getFromCache(startIdx, numItems) {
            let cached = me.cache.get(startIdx, numItems);
            return (cached) ? $q.when(cached) : null;
        }
        
        /**
         * Reset the cache and current page information if the search term differs from the previous
         * search.
         *
         * @param {String} newSearchTerm  The current search term.
         */
        function resetIfSearchChanged(newSearchTerm) {
            if (lastSearchTerm !== newSearchTerm) {
                // Clear the cache
                me.cache.reset();
                // Save the new search term to remember it for our next fetch.
                lastSearchTerm = newSearchTerm;
                // Reset the displayed page number back to 0.
                me.displayedPageNumber = 0;
            }
        }
        
        /**
         * Search for the entitlements owned by the user.
         *
         * @param {String} searchTerm The search term for filtering results.
         * @param {Object} filterValues Filter values (not used in this implementation).
         * @param {Number} startIdx The zero-based start index.
         * @param {Number} itemsPerPage The number of items to display per page.
         * @param {SortOrder} sortOrder The SortOrder holding sorts (not used in this implementation).
         *
         * @return {Promise<ListResult>} A promise that will resolve to a ListResult
         *     with the requested items.
         */
        this.doSearch = function(searchTerm, filterValues, startIdx, itemsPerPage, sortOrder) {
            // First, reset stuff if the search term is changing.
            resetIfSearchChanged(searchTerm);
            let listStart = startIdx, 
                listEnd = startIdx + itemsPerPage, 
                results;

            // First try to load the results from the cache.
            results = getFromCache(listStart, itemsPerPage);
            
            // If not found in the cache, hit the server.
            if (!results) {
                results = loadIntoCache(searchTerm, startIdx).then(function() {
                    // Now that its in the cache, get the requested stuff back from the cache.
                    return getFromCache(listStart, itemsPerPage);
                });
            }
            
            // Wrap the result in an HTTP Promise looking thing.
            return results.then(function(listResult) {
                return {
                    data: listResult
                };
            });
        };
        
        /**
         * Load the next chunk of data into the cache, starting at the given index.
         *
         * @param {String} searchTerm The search term for filtering.
         * @param {Number} startIdx The start index to load into the cache.
         *
         * @return {Promise<ListResultDTO>} A promise that resolves with the data that was loaded.
         */
        function loadIntoCache(searchTerm, startIdx) {
            return EntitlementOwnershipService.getEntitlements(searchTerm, startIdx, CACHE_CHUNK_SIZE).then(function(entitlements) {
                // Add the loaded data to the cache.
                me.cache.add(entitlements, startIdx, CACHE_CHUNK_SIZE);
                return entitlements;
            });
        }
        
        /**
         * We don't support filters - just return an empty list.
         */
        this.doLoadFilters = function() {
            return $q.when([]);
        };
        
        /**
         * Helper method to handle focusing and animations when changing page
         * @param {Function} changePageFunc Super method to call to actually change the page
         */
        function changePage(changePageFunc) {
            return changePageFunc().then(function() {
                // Current page is 1-based, so subtract 1 to get a zero-based index.
                me.displayedPageNumber = me.pageState.pagingData.currentPage - 1;
                // This must be in a timeout or else the watch in the focus snatcher doesn't get the correct values.
                $timeout(function() {
                    me.focusOnList = true;
                });
            }).then(function() {
                // After changing the page, preload more data into the cache if we need to.
                preloadCache();
            });
        }
        
        /**
         * If we are near the end of our cached data, load some more.
         */
        function preloadCache() {
            var loadedSize = me.pageState.pagingData.getStart() + me.pageState.pagingData.itemsPerPage;
            // If we're within a couple pages of the end of the cache, go ahead and load more data.
            if (loadedSize >= me.cache.size - 10) {
                loadIntoCache(me.pageState.searchData.searchTerm, me.cache.size);
            }
        }
        
        /**
         * Extend nextPage() to focus on the list after the data is loaded, set data required by
         * animations, and preload data into the cache if needed.
         */
        this.nextPage = function() {
            // Don't need to do a previous page refetch since we're moving the list again.
            cancelPreviousPageRefetch();
            // Do the paging.
            changePage(EntitlementOwnershipCtrl._super.prototype.nextPage.bind(me));
        };
        
        /**
         * If there is a pending request to refetch a previous page, cancel it.
         */
        function cancelPreviousPageRefetch() {
            if (previousPageRefreshPromise) {
                $timeout.cancel(previousPageRefreshPromise);
                previousPageRefreshPromise = null;
            }
        }
        
        /**
         * Extend previousPage() to focus on the list after the data is loaded, set data required by
         * animations, and preload data into the cache if needed.
         */
        this.previousPage = function() {
            // Set this to true so we keep some extra rows in the list while the animation is happening.
            fetchForPreviousPage = true;
            changePage(EntitlementOwnershipCtrl._super.prototype.previousPage.bind(me))["finally"](function() {
                // Cancel the existing request to refetch if there is one.
                cancelPreviousPageRefetch();
                // Wait a couple of seconds and then trim the results to the actual desired size once
                // the transition is complete.
                previousPageRefreshPromise = $timeout(function() {
                    me.fetchItems();
                }, 2000);
            });
            // Set this back to false for the next request.
            fetchForPreviousPage = false;
        };
       
        /**
         * Exports the entitlement ownership data to CSV file.
         */
        this.exportToCSV = function() {
            // Use the current search term for filtering
            let searchTerm = me.pageState.searchData.searchTerm;
            
            // Get the export URL with optional search parameter
            let exportUrl = EntitlementOwnershipService.getExportUrl(searchTerm);
            
            // Open in a new window/tab or download based on browser behavior
            $window.open(exportUrl, '_blank');
        };
        
        /**
         * Opens the details dialog for an entitlement or role using SailPoint's existing functionality
         * @param {Object} item The entitlement or role to show details for
         */
        /*this.openDetailsDialog = function(item) {
			console.log('item1' + item);
            
            // If we can't find the OOTB controller, use our fallback implementation
            try {
                var spModal = $injector.get('spModal');
				console.log('spModal' + spModal);
                var contextPath = $injector.get('SP_CONTEXT_PATH');
                console.log('contextPath' + contextPath);
                if (item.isRole) {
					console.log('item is role');
                    // For roles/bundles, use the role detail dialog
                    var roleDetailDialogService = $injector.get('roleDetailDialogService');
					console.log('roleDetailDialogService' + roleDetailDialogService);
                    var roleUrlFunc = function(id) {
						console.log('id' + id);
                        return contextPath + '/rest/managedAttributes/' + id;
                    };
					console.log('id2' + id);
                    roleDetailDialogService.showDialog(item, null, roleUrlFunc);
                } else {
					console.log('Item is an entitlement');
					var managedAttributeDialogService = $injector.get('managedAttributeDialogService');
					var managedAttributeService = $injector.get('managedAttributeService');
					console.log('Managed attribute dialog service:', managedAttributeDialogService);
					console.log('Managed attribute service:', managedAttributeService);
					
					// Create the URL for the entitlement
					var detailResourceUrl = contextPath + '/ui/rest/requestAccess/accessItems/' + item.id + "/managedAttributeDetails?identityId=" + item.owner.id + "&quickLink=Request+Access";
					console.log('Detail resource URL:', detailResourceUrl);
					
					// Get the entitlement details promise
					var entitlementDetailsPromise = managedAttributeService.getEntitlementDetails(detailResourceUrl);
					console.log('Entitlement details promise:', entitlementDetailsPromise);
					
					
					// Show the dialog with the promise and URL
					managedAttributeDialogService.showDialog(entitlementDetailsPromise, detailResourceUrl);
				}
            } catch (e) {
                console.error('Error opening details dialog:', e);
                
                // Last resort - open alert with basic info
                alert('Details for ' + item.name + '\nApplication: ' + item.applicationName + 
                    '\nAttribute: ' + item.attributeName + 
                    (item.description ? '\nDescription: ' + item.description : ''));
            }
        };*/
		
		/**
		 * Opens the details dialog for an entitlement or role
		 * @param {Object} item The entitlement or role to show details for
		 */
		this.openDetailsDialog = function(item) {
			console.log('Opening details for:', item);
			
				var spModal = $injector.get('spModal');
				console.log('spModal: ' + spModal);
                var contextPath = $injector.get('SP_CONTEXT_PATH');
                console.log('contextPath: ' + contextPath);
				
				// Get required services
				var managedAttributeService = $injector.get('managedAttributeService');
				var managedAttributeDialogService = $injector.get('managedAttributeDialogService');
				var roleDetailDialogService = $injector.get('roleDetailDialogService');
				
				if (!item.hasClassifications) {
					// Add function to check for classifications
					item.hasClassifications = function() {
						return item.hasClassifications || false;
					};
				}
				
				// Base URL for access items
				var accessItemsUrl = "/ui/rest/requestAccess/accessItems/";
				
				// Function to get entitlement details URL
				var getEntitlementDetailsUrl = function(id) {
					return contextPath + accessItemsUrl + id + "/managedAttributeDetails";
				};
				
				
					console.log('Item is a managed attribute');
					
					// Create options for the dialog
					var options = {
						includeClassifications: !!item.hasClassifications()
					};
					
					// Get the managed attribute ID
					var managedAttributeId = item.id;
					
					// Get the URL for entitlement details
					var detailResourceUrl = getEntitlementDetailsUrl(managedAttributeId);
					
					// Set any required context on the managedAttributeService
					managedAttributeService.setTargetId(item.owner.id); // No identity ID
					managedAttributeService.setQuickLink("Details"); // No quickLink
					
					// Get the entitlement details
					var entitlementDetailsPromise = managedAttributeService.getEntitlementDetails(detailResourceUrl);
					
					// Show the dialog
					managedAttributeDialogService.showDialog(
						entitlementDetailsPromise, 
						detailResourceUrl, 
						options
					);
		};
		
        
        /**
         * @property {Boolean} A flag that gets set to true after paging to draw the focus back to
         *     the top of the list.
         */
        this.focusOnList = false;
        
        /**
         * @property {Number} The zero-based number of the page that is being displayed.
         */
        this.displayedPageNumber = 0;
        
        // We need a truthy columnConfigs value for AbstractListCtrl to work even though we aren't
        // using them.
        this.columnConfigs = [];
        
        // Initialize when the controller is constructed.
        this.initialize();
    }
    
    EntitlementOwnershipCtrl.$inject = ['SearchData', 'PageState', 'PagingData', '$q', '$timeout', 'configService', 'EntitlementOwnershipService', 'navigationService', 'ListResultDTO', 'ListResultCache', '$window', '$injector'];
    SailPoint.extend(EntitlementOwnershipCtrl, AbstractListCtrl);

    var widgetFunction = function() {
        angular.module('sailpoint.home.desktop.app')
        .service('EntitlementOwnershipService', ['$http', 'ListResultDTO', 
            function($http, ListResultDTO) {
                this.getEntitlements = function(searchTerm, start, limit) {
                    var params = {
                        start: start,
                        limit: limit
                    };
    
                    // Only send the search term if it was specified.
                    if (searchTerm) {
                        params.query = searchTerm;
                    }
                    
                    return $http.get(PluginHelper.getPluginRestUrl("EntitlementOwnershipWidget/list"), {
                        params: params
                    }).then(function(response) {
                        // The backend now returns properly formatted data for OOTB compatibility
                        return new ListResultDTO(response.data);
                    });
                };
                
                /**
                 * Returns the URL for exporting entitlement data
                 * @param {String} searchTerm The search term to filter the export
                 * @return {String} The export URL
                 */
                this.getExportUrl = function(searchTerm) {
                    var exportUrl = PluginHelper.getPluginRestUrl("EntitlementOwnershipWidget/export");
                    
                    // Add query parameter if search term is specified
                    if (searchTerm) {
                        exportUrl += "?query=" + encodeURIComponent(searchTerm);
                    }
                    
                    return exportUrl;
                };
            }
        ])
        .controller('EntitlementOwnershipCtrl', EntitlementOwnershipCtrl)
        .directive('spEntitlementOwnershipWidget', function() {
            let phFunction = PluginHelper.getPluginFileUrl;
            return {
                restrict: 'E',
                scope: {
                    widget: '=spWidget'
                },
                controller: 'EntitlementOwnershipCtrl',
                controllerAs: 'ctrl',
                bindToController: true,
                templateUrl: phFunction("EntitlementOwnershipWidget", "ui/templates/widget.html")
            };
        });
    };
    
    PluginHelper.addWidgetFunction(widgetFunction);
})();