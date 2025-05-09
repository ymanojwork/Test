package com.sailpoint.plugins.rest;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import sailpoint.api.SailPointContext;
import sailpoint.authorization.Authorizer;
import sailpoint.authorization.CapabilityAuthorizer;
import sailpoint.authorization.CompoundAuthorizer;
import sailpoint.integration.ListResult;
import sailpoint.object.Bundle;
import sailpoint.object.ManagedAttribute;
import sailpoint.object.Attributes;
import sailpoint.object.Filter;
import sailpoint.object.Identity;
import sailpoint.object.QueryOptions;
import sailpoint.rest.plugin.BasePluginResource;
import sailpoint.rest.plugin.Deferred;
import sailpoint.tools.GeneralException;

/**
 * Widget RESTful class for fetching entitlement ownership details
 */
@Produces({ MediaType.APPLICATION_JSON })
@Consumes({ MediaType.APPLICATION_JSON })
@Path("EntitlementOwnershipWidget")
public class EntitlementOwnershipResource extends BasePluginResource {

    /**
     * The logger to use
     */
    public static final Log log = LogFactory.getLog(EntitlementOwnershipResource.class);

    /**
     * Query identityiq for entitlement ownership data
     *
     * @param query Optional search term to filter results
     * @param start Start index for paging
     * @param limit Number of items to return
     * @return A ListResult of the objects
     * @throws GeneralException
     * @throws SQLException
     */
    @GET
    @Path("list")
    @Deferred
    public ListResult getData(
            @QueryParam("query") String query,
            @QueryParam("start") Integer start,
            @QueryParam("limit") Integer limit) throws GeneralException, SQLException {
        
        int total = 0;
        SailPointContext context = getContext();
        Identity caller = this.getLoggedInUser();
        List<Map<String, Object>> listDTO = new ArrayList<>();
        
        if (caller == null) {
            Map<String, Object> result = new HashMap<>();
            listDTO.add(result);
            log.error("Could not find an identity for logged in user.");
            return new ListResult(listDTO, total);
        }
        
        // Require user to have entitlement owner capabilities or be a system admin
        Authorizer authorizer = CompoundAuthorizer.or(
                new CapabilityAuthorizer("SystemAdministrator"),
                new CapabilityAuthorizer("EntitlementOwner")
        );
        
        // Throws a 401 if not authorized
        authorize(authorizer);

        // Set default values for pagination if not provided
        if (start == null) start = 0;
        if (limit == null) limit = 20;

        QueryOptions qo = new QueryOptions();
        qo.add(Filter.eq("owner.id", caller.getId()));
        qo.add(Filter.eq("type", "business"));
        
        // Add search filter if query parameter is provided
        if (query != null && !query.isEmpty()) {
            Filter nameFilter = Filter.like("displayName", query);
            qo.add(Filter.or(nameFilter));
        }
        
        qo.setFirstRow(start);
        qo.setResultLimit(limit);
        
        // Count total bundles owned by the user
        int bundleCount = context.countObjects(Bundle.class, qo);
        
        // Get bundles with pagination
        if (bundleCount > 0) {
            List<Bundle> bundles = context.getObjects(Bundle.class, qo);
            for (Bundle bundle : bundles) {
                Map<String, Object> result = new HashMap<>();
                
                // Common properties
                result.put("type", "bundle");
                result.put("id", bundle.getId());
                result.put("name", bundle.getName());
                result.put("displayName", bundle.getDisplayName());
                result.put("attributeName", "assignedRoles");
                result.put("applicationName", "IdentityIQ");
                result.put("description", bundle.getDescription("en_US"));
                result.put("disabled", bundle.isDisabled());
                
                // Set owner information
                Map<String, Object> owner = new HashMap<>();
                if (bundle.getOwner() != null) {
                    owner.put("id", bundle.getOwner().getId());
                    owner.put("displayName", bundle.getOwner().getDisplayName());
                    owner.put("name", bundle.getOwner().getName());
                }
                result.put("owner", owner);
                
                Map<String, Object> extendedAttributes = new HashMap<>();
                if (bundle.getExtendedAttributes() != null) {
                	extendedAttributes = bundle.getExtendedAttributes();
                }
                result.put("extendedAttributes", extendedAttributes);
                
                listDTO.add(result);
            }
        } else {
            log.info("No roles found for the current user");
        }
        
        // Reset query options for entitlements
        qo = new QueryOptions();
        qo.add(Filter.eq("owner.id", caller.getId()));
        if (query != null && !query.isEmpty()) {
            Filter nameFilter = Filter.like("displayName", query);
            qo.add(Filter.or(nameFilter));
        }
        
        qo.setFirstRow(start);
        qo.setResultLimit(limit);
        
        // Count total entitlements owned by the user
        int entitlementCount = context.countObjects(ManagedAttribute.class, qo);
        
        // Get Entitlements with pagination
        if (entitlementCount > 0) {
            List<ManagedAttribute> entitlements = context.getObjects(ManagedAttribute.class, qo);
            for (ManagedAttribute entitlement : entitlements) {
                Map<String, Object> result = new HashMap<>();
                
                // Common properties
                result.put("type", "managedAttribute");
                result.put("id", entitlement.getId());
                result.put("name", entitlement.getValue());
                result.put("displayName", entitlement.getDisplayName());
                result.put("attributeName", entitlement.getAttribute());
                result.put("applicationName", entitlement.getApplication().getName());
                result.put("description", entitlement.getDescription("en_US"));
                result.put("requestable", entitlement.isRequestable());
                
                // Set owner information
                Map<String, Object> owner = new HashMap<>();
                if (entitlement.getOwner() != null) {
                    owner.put("id", entitlement.getOwner().getId());
                    owner.put("displayName", entitlement.getOwner().getDisplayName());
                    owner.put("name", entitlement.getOwner().getName());
                }
                result.put("owner", owner);
                
                Map<String, Object> extendedAttributes = new HashMap<>();
                if (entitlement.getExtendedAttributes() != null) {
                	extendedAttributes = entitlement.getExtendedAttributes();
                }	
                result.put("extendedAttributes", extendedAttributes);
                
                listDTO.add(result);
            }
        } else {
            log.info("No entitlements found for the current user");
        }
        
        // Sort by application name then name
        listDTO.sort((a, b) -> {
            String appA = (String) a.get("applicationName");
            String appB = (String) b.get("applicationName");
            int appCompare = appA.compareTo(appB);
            if (appCompare != 0) {
                return appCompare;
            }
            String nameA = (String) a.get("name");
            String nameB = (String) b.get("name");
            return nameA.compareTo(nameB);
        });

        // Set total count for pagination
        total = bundleCount + entitlementCount;
        
        return new ListResult(listDTO, total);
    }

    @Override
    public String getPluginName() {
        return "EntitlementOwnershipWidget";
    }
}