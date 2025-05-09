'use strict';

//import angular from 'angular';

////////////////////////////////////////////////////////////////////////////////
//
// CONSTRUCTOR
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Constructor for the AbstractListCtrl abstract class - this should only be
 * called by sub-classes.  An AbstractListCtrl contains common behavior for
 * loading items in a list page, searching/filtering, paging, etc...
 * Sub-classes should implement the abstract methods to return the correct data,
 * filters, and configuration to use to display their specific data.
 *
 * @param {SearchData} SearchData  The SearchData class.
 * @param {Object} $q  The $q service.
 * @param {Object} $timeout  The $timeout service.
 * @param {Object} configService  The configService.
 * @param {PageState} initialPageState  The PageState to use when the page is
 *     initially loaded.
 *
 * @throws If initialPageState is null or doesn't have search data.
 */
function AbstractListCtrl(SearchData, $q, $timeout, configService, initialPageState) {
	//console.log("AbstractListCtrl");
    if (!initialPageState || !initialPageState.searchData) {
        throw 'Initial page state with searchData is required.';
    }

    // Save the dependencies on this object so the methods on the prototype
    // can access them.
    this.$q = $q;
    this.$timeout = $timeout;
    this.configService = configService;

    // Set up the page state based on the initial state.
    this.pageState = initialPageState;
    this.searchScratchPad = new SearchData(initialPageState.searchData);
    this.columnConfigDeferred = this.$q.defer();
}

// Add the properties and methods to the class.
angular.extend(AbstractListCtrl.prototype, {

    ////////////////////////////////////////////////////////////////////////////
    //
    // PROPERTIES
    //
    ////////////////////////////////////////////////////////////////////////////

    /**
     * Constant to indicate that no items are expected to be returned.
     * we want to distinguish between no items on initial load and no items returned from a search.
     */
    NO_INITIAL_ITEMS: -1,

    /**
     * An array of objects to be displayed.
     */
    items: undefined,

    /**
     * The meta data from the result of the item fetch
     */
    metaData: undefined,

    /**
     * The page state for the list.
     * @type {PageState}
     */
    pageState: undefined,

    /**
     * Intermediary place between the searchData and the UI.  When search/apply is clicked
     * the values should be copied over to the searchData shared with the service
     * @type {SearchData}
     */
    searchScratchPad: undefined,

    /**
     * Array of ColumnConfigs used to display card data.  This is automatically
     * populated during initialization if the sub-class returns a value from
     * getColumnConfigKey(), otherwise it is the responsibility of the sub-class
     * to load and use the appropriate column config.
     *
     * @type {Array}
     */
    columnConfigs: undefined,

    /**
     * List of ColumnConfigs filtered to only those that are displayed. This will
     * be set only if setColumnConfigs() is called with an array value.
     * @type {Array}
     */
    displayedColumnConfigs: undefined,

    /**
     * A boolean indicating if the filter panel is collapsed or expanded
     */
    filtersDisplayed: false,

    /**
     * Boolean indicating whether or not the column editor panel is expanded
     */
    columnEditorDisplayed: false,

    /**
     * Used to indicate that the result set should be focused
     * @type {boolean}
     */
    focusResults: false,

    /**
     * Used to hold a promise that will be resolved when column configs are set.
     * This way we block setting the items until that time.
     * @type {Deferred}
     */
    columnConfigDeferred: undefined,

    /**
     * Used to indicate if we will initially load results when the page is first
     * displayed.
     * @type {boolean}
     */
    disableInitialLoad: false,

    ////////////////////////////////////////////////////////////////////////////
    //
    // ABSTRACT METHODS
    //
    ////////////////////////////////////////////////////////////////////////////

    /**
     * Sub-class should implement to perform the search for items using the
     * given parameters.
     *
     * @param {String} searchTerm  The search term to search with.
     * @param {Object} filterValues  An object with key/value pairs of filter
     *     properties and their values.
     * @param {Number} startIdx  The zero-based start index.
     * @param {Number} itemsPerPage  The number of items to display per page.
     * @param {SortOrder} sortOrder The SortOrder holding sorts. May be null or undefined.
     *
     * @return {Promise<ListResult>} A promise that will resolve to a ListResult
     *     with the requested items.
     */
    doSearch: function(searchTerm, filterValues, startIdx, itemsPerPage, sortOrder) {
        throw 'Must be implemented in sub-class.';
    },

    /**
     * Sub-class should implement to retrieve the Filters to be displayed in the
     * filter panel.
     *
     * @return {Promise<Array<Filter>>} A promise that will resolve to an array
     *     of Filters to be displayed in the filter panel.
     */
    doLoadFilters: function() {
        throw 'Must be implemented in sub-class.';
    },

    /**
     * Sub-classes may implement this to return the configuration key that holds
     * the ColumnConfigs for this list page.  If unimplemented, this returns null
     * and the sub-class is responsible for managing ColumnConfigs.
     */
    getColumnConfigKey: function() {
        return null;
    },

    /**
     * Subclasses may override this to determine if they want to automatically hide
     * the filters after searching. Default is true.
     * @returns {boolean} True to hide filters after search.
     */
    isHideFiltersOnSearch: function() {
        return true;
    },

    /**
     * Subclasses may override this if they want to populate the items array in some increment. For example, if
     * this returns anything non-zero, items will be added to the array in batches of the given size, per digest cycle.
     * This is helpful for large page sizes if performance degrades.
     * @returns {number} Zero to skip inner paging, or any number
     */
    getInnerPageSize: function() {
        return 0;
    },

    /**
     * Subclasses should override this if they want to skip destroying the items array each time
     * when fetching. This can improve performance by avoiding destroying and recreating DOM
     * elements for every page/sort action.
     * @returns {boolean}
     */
    isClearItemsBeforeFetch: function() {
        return true;
    },

    /**
     * Subclasses may override this to do something once all the items are loaded into the array.
     */
    itemsLoaded: function() {},

    ////////////////////////////////////////////////////////////////////////////
    //
    // METHODS
    //
    ////////////////////////////////////////////////////////////////////////////

    /**
     * Fetch the objects for the current page by delegating to doSearch() and
     * set the results when complete.
     */
    fetchItems: function() {
        var searchTerm = this.getPageState().searchData.searchTerm,
            filterValues = this.getPageState().searchData.filterValues,
            pagingData = this.getPageState().pagingData,
            promise = this.doSearch(searchTerm, filterValues, pagingData.getStart(), pagingData.itemsPerPage,
                                    this.getPageState().sortOrder);

        this.clearItems();

        return promise.then((response) => {
            if(response.data) {
                this.setItems(response.data.objects, response.data.count, response.data.metaData);
            }
        });
    },

    /**
     * @private
     *
     * Clear the items, depending on the setting.
     */
    clearItems: function() {
        if (this.items && this.isClearItemsBeforeFetch()) {
            /* Reset items so the loading mask is displayed */
            this.items = undefined;
        }
    },

    /**
     * Search handler.  Executes search sets current page to 1.  If event is passed
     * search is only performed if event is for the enter key
     *
     * @param {KeyboardEvent} [keyEvent] If specified search is only performed if for enter key
     */
    search: function(keyEvent) {
        var searchTimeout = 0;

        /* If we got a key event see if it was enter */
        if (keyEvent) {
            // Do nothing if it's not the enter key.
            if (keyEvent.keyCode !== 13) {
                return;
            }

            // IE10 likes to click random stuff on the page for enter events, so prevent the
            // default action.
            keyEvent.preventDefault();
        }

        if (this.filtersDisplayed && this.isHideFiltersOnSearch()) {
            /* Give some time for the collapsing animation to complete */
            searchTimeout = 400;
            /* Reset items so the loading mask is displayed */
            this.clearItems();
            /* Hide the filter panel */
            this.filtersDisplayed = false;
        }

        // Use timeout to avoid DOM conflicts and let the animations complete if necessary
        this.$timeout(() => {
            // Transfer scratch value to search value.
            this.getPageState().searchData.merge(this.searchScratchPad);

            // Go back to the first page.
            this.getPageState().pagingData.currentPage = 1;

            // Send the focus back to the results after searching.
            this.focusResults = true;

            // Load the items if needed.
            var searchTerm = this.getPageState().searchData.searchTerm;
            if (searchTerm === '' && this.disableInitialLoad) {
                this.setItems([], this.NO_INITIAL_ITEMS);
            } else {
                // Fetch the items
                this.fetchItems();
            }
        }, searchTimeout);
    },

    /**
     * Fetches previous page of results updating page state.
     *
     * @return {Promise} A promise that resolves after the items have been fetched, or null if the
     *     page is not changed.
     */
    nextPage: function() {
        if (this.getPageState().pagingData.next()) {
            return this.fetchItems();
        }
        return null;
    },

    /**
     * Fetches next page of results updating page state
     *
     * @return {Promise} A promise that resolves after the items have been fetched, or null if the
     *     page is not changed.
     */
    previousPage: function() {
        if (this.getPageState().pagingData.previous()) {
            return this.fetchItems();
        }
        return null;
    },

    /**
     * Returns the pageState object
     * @returns {PageState|pageState}
     */
    getPageState: function() {
        return this.pageState;
    },

    /**
     * Return whether to show the current page info ("Showing x-y of z").  This
     * is not displayed if there are no results.
     */
    showCurrentPageInfo: function() {
        return this.getPageState().pagingData.getTotal() > 0;
    },

    /**
     * Function that toggles the filter panel between collapsed and expanded
     */
    toggleFiltersDisplayed: function() {
        // if the column editor panel is displayed close it first
        if (this.columnEditorDisplayed) {
            this.toggleColumnEditor();
        }

        this.filtersDisplayed = !this.filtersDisplayed;
    },

    /**
     * Return true if any filters have values and have been applied.
     */
    hasAppliedFilters: function() {
        return this.getPageState().searchData.hasFilterValues();
    },

    /**
     * Toggles the column editor panel
     */
    toggleColumnEditor: function() {
        // if the filter panel is displayed close it first
        if (this.filtersDisplayed) {
            this.toggleFiltersDisplayed();
        }

        this.columnEditorDisplayed = !this.columnEditorDisplayed;
    },

    /**
     * Determines if the loading mask should be shown or not.
     * @returns {boolean}
     */
    isPageReady: function() {
        return (this.columnConfigs && this.items);
    },

    /**
     * Update the class items array based on the results. If getInnerPageSize has been overridden,
     * this will recurse over itself, adding items in increments.
     * @param {Array} items The full set of result items
     * @param {Number} innerPageSize The number of results to put into items array each call.
     * @param {Number} [start] The index to start set from. Optional.
     */
    updateItems: function(items, innerPageSize, start) {
        start = (start) ? start : 0;
        items = (items) ? items : [];

        if (innerPageSize === 0) {
            // Just set the items if no inner paging
            this.items = items;
            this.itemsLoaded();
        } else {
            let lastItemsIndex = items.length - 1,
                // Ensure we don't go past the end of the array
                end = Math.min(start + innerPageSize - 1, lastItemsIndex);

            if (!this.items) {
                this.items = [];
            }

            if (items.length === 0 || start >= this.items.length) {
                // If we are going to be adding new elements for all the items anyway, just push them all.
                this.items.push(...items.slice(start, end + 1));
            } else {
                // Otherwise either replace or push as required.
                for (let i = start; i <= end; i++) {
                    if (this.items.length < i) {
                        this.items.push(items[i]);
                    } else {
                        this.items[i] = items[i];
                    }
                }
            }
            if (end < lastItemsIndex) {
                // Use timeout to let previous results render.
                this.$timeout(() => {
                    this.updateItems(items, innerPageSize, end + 1);
                });
            } else {
                // If page size changed, we may have extra elements on our items array when done, cut them off.
                if (this.items.length > end) {
                    this.items.splice(end + 1);
                }

                // All done.
                this.itemsLoaded();
            }
        }
    },

    /**
     * Sets the items, but only when columnConfigs are set.
     *
     * @param items objects to be displayed
     * @param count total number of results
     * @param metaData The metaData from the results.
     */
    setItems: function(items, count, metaData) {
        // Block on this promise until column configs are set.
        this.columnConfigDeferred.promise.then(() => {
            this.updateItems(items, this.getInnerPageSize());
            this.getPageState().pagingData.setTotal(count);
            this.metaData = this.convertMetaData(metaData);
        });
    },

    /**
     * Make any conversions to metaData. By default does nothing.
     * @param {Object} metaData MetaData object
     * @returns {Object} Converted metaData object
     */
    convertMetaData: function(metaData) {
        return metaData;
    },

    /**
     * Sets columnConfigs (and possibly displayedColumnConfigs), then unblocks setItems.
     *
     * @param configs array of column configs
     */
    setColumnConfigs: function(configs) {
        this.columnConfigs = configs;
        if (angular.isArray(this.columnConfigs)) {
            this.displayedColumnConfigs = this.columnConfigs.filter((column) => {
                return column.isDisplayed();
            });
        } else {
            this.displayedColumnConfigs = undefined;
        }

        // Resolve this to unblock setItems
        this.columnConfigDeferred.resolve();
    },

    /**
     * Fetches the columns from the config service.
     * @param {String} configKey Key for the column config entry
     * @returns {Promise<Array<ColumnConfig>>} Promise that resolves with the list of column configs
     */
    getColumnConfigs: function(configKey) {
        return this.configService.getColumnConfigEntries(configKey).then((result) => result.data[configKey]);
    },

    /**
     * Sort the list
     * @param {ColumnConfig} columnConfig Column we are sorting on
     * @param {Boolean} ascending True if ascending, otherwise false. Optional.
     * @returns {Promise}
     */
    sort: function(columnConfig, ascending) {
        if (!angular.isDefined(columnConfig)) {
            throw 'columnConfig is required!';
        }

        if (columnConfig.isSortable()) {
            this.getPageState().setSort(columnConfig.getDataIndex(), ascending);
            return this.fetchItems();
        }
        return this.$q.when();
    },

    /**
     * Sort the list by SortOrder object
     * @param {SortOrder} sortOrder The sort order
     * @param {Boolean} [doFetch] If true or undefined, fetch items. Optional.
     */
    sortBySortOrder: function(sortOrder, doFetch) {
        this.getPageState().setSortOrder(sortOrder);
        if (!angular.isDefined(doFetch) || doFetch) {
            // reset page since new items were fetched and could change number of pages
            this.getPageState().pagingData.currentPage = 1;
            this.fetchItems();
        }
    },

    /**
     * Clear the sort.
     */
    clearSort: function() {
        this.getPageState().clearSort();
        this.fetchItems();
    },

    /**
     * See if the given column is the current sort.
     * @param {ColumnConfig} columnConfig Column to match
     * @returns {Boolean} True if matches, otherwise false.
     */
    isSortColumn: function(columnConfig) {
        var sortOrder;

        if (!angular.isDefined(columnConfig)) {
            throw 'columnConfig is required!';
        }

        if (columnConfig.isSortable()) {
            sortOrder = this.getPageState().sortOrder;
            return angular.isDefined(sortOrder) && (sortOrder.getSortProperty() === columnConfig.getDataIndex());
        }

        return false;
    },

    /**
     * See if the given column is the current sort and ascending.
     * @param {ColumnConfig} columnConfig Column to match
     * @returns {Boolean} True if matches and ascending, otherwise false.
     */
    isSortAscending: function(columnConfig) {
        if (!angular.isDefined(columnConfig)) {
            throw 'columnConfig is required!';
        }

        if (this.isSortColumn(columnConfig)) {
            return this.getPageState().sortOrder.isSortAscending();
        }

        return false;
    },

    /**
     * Check if the given SortOrder matches the current set sort order
     * @param {SortOrder} sortOrder SortOrder to check
     * @returns {boolean} True if matches, otherwise false.
     */
    isSortOrder: function(sortOrder) {
        return sortOrder === this.getPageState().sortOrder;
    },
	

    ////////////////////////////////////////////////////////////////////////////
    //
    // INITIALIZATION
    //
    ////////////////////////////////////////////////////////////////////////////

    /**
     * Initialize the data for this controller.  Sub-classes should call this
     * when they are constructed.
     *
     * @return {Promise} A promise that is resolved when both the configuration
     *    and data fetching are complete.
     */
    initialize: function() {
        var configKey = this.getColumnConfigKey(),
            blockingPromises = [],
            fetchPromise, configPromise;

        // Clear items when initializing grid so we get the loading mask immediately
        this.items = undefined;

        // Load the items if needed.
        if (!this.disableInitialLoad) {
            fetchPromise = this.fetchItems();
            blockingPromises.push(fetchPromise);
        } else {
            this.setItems([], this.NO_INITIAL_ITEMS);
        }

        // If the sub-class returns a column config key, load them.
        if (configKey) {
            configPromise = this.getColumnConfigs(configKey).
                then((columns) => {
                    this.setColumnConfigs(columns);
                });
            blockingPromises.push(configPromise);
        } else {
            // We don't require column configs if there is no key, so resolve here so items can be set.
            this.columnConfigDeferred.resolve();
        }

        let filtersPromise;
        if (!this.getPageState().searchData.areFiltersInitialized()) {
            // Load the filters.
            filtersPromise = this.doLoadFilters().then((filters) => {
                this.getPageState().searchData.initializeFilters(filters);
            });
        } else {
            filtersPromise = this.$q.when();
        }

        // Set the values on scratch pad back to page state search data when we initialize
        filtersPromise.then(() => {
            this.searchScratchPad.merge(this.getPageState().searchData);
        });

        return this.$q.all(blockingPromises);
    }
});

//export default AbstractListCtrl;