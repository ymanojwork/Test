package com.sailpoint.plugin.myentitlementsandroles.rest;

import com.sailpoint.plugin.myentitlementsandroles.model.MyEntitlementsAndRolesResult;
import com.sailpoint.plugin.myentitlementsandroles.model.MyEntitlementsAndRolesResult.Type;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import sailpoint.api.SailPointContext;
import sailpoint.api.SailPointFactory;
import sailpoint.object.ManagedAttribute;
import sailpoint.object.Filter;
import sailpoint.object.Identity;
import sailpoint.object.QueryOptions;
import sailpoint.object.Bundle;
import sailpoint.rest.plugin.AllowAll;
import sailpoint.rest.plugin.BasePluginResource;
import sailpoint.tools.GeneralException;
import sailpoint.web.plugin.config.PluginRegistry;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.ArrayList;
import java.util.List;

/**
 * EntitlementRolesResource provides REST API endpoints to retrieve
 * entitlements and roles owned by the logged-in user.
 */
@Path("entitlement-roles")
@Produces(MediaType.APPLICATION_JSON)
public class EntitlementRolesResource extends BasePluginResource {

    private static Log log = LogFactory.getLog(EntitlementRolesResource.class);

    /**
     * Returns a list of entitlements owned by the current user
     * @param searchTerm Optional search term to filter results by display name
     * @param limit Maximum number of results to return
     * @param offset Pagination offset
     * @return List of ownership results
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("owned-entitlements")
    @AllowAll
    public List<OwnershipResult> getOwnedEntitlements(
            @QueryParam("searchTerm") String searchTerm,
            @QueryParam("limit") @DefaultValue("25") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) throws GeneralException {
        
        SailPointContext context = SailPointFactory.getCurrentContext();
        List<OwnershipResult> results = new ArrayList<>();
        
        try {
            // Get the current user
            Identity currentUser = context.getObjectByName(Identity.class, getLoggedInUserName());
            if (currentUser == null) {
                log.error("Current user not found: " + getLoggedInUserName());
                return results;
            }
            
            // Create query options to find entitlements owned by current user
            QueryOptions qo = new QueryOptions();
            Filter ownerFilter = Filter.eq("owner.id", currentUser.getId());
            
            // Add search filter if a search term is provided
            if (searchTerm != null && !searchTerm.isEmpty()) {
                Filter nameFilter = Filter.ilike("displayableName", "%" + searchTerm + "%");
                qo.addFilter(Filter.and(ownerFilter, nameFilter));
            } else {
                qo.addFilter(ownerFilter);
            }
            
            // Set pagination
            qo.setFirstRow(offset);
            qo.setMaxRows(limit);
            
            // Execute query
            List<ManagedAttribute> entitlements = context.getObjects(ManagedAttribute.class, qo);
            
            // Convert to OwnershipResult objects
            for (Entitlement entitlement : entitlements) {
                OwnershipResult result = new OwnershipResult();
                result.setId(entitlement.getId());
                result.setDisplayName(entitlement.getDisplayableName());
                result.setApplication(entitlement.getApplication().getName());
                result.setDescription(entitlement.getDescription());
                result.setOwnershipType(Type.ENTITLEMENT);
                
                // Add additional entitlement details as needed
                results.add(result);
            }
            
        } catch (Exception e) {
            log.error("Error getting owned entitlements", e);
            throw new GeneralException("Error getting owned entitlements", e);
        }
        
        return results;
    }
    
    /**
     * Returns a list of roles owned by the current user
     * @param searchTerm Optional search term to filter results by name
     * @param limit Maximum number of results to return
     * @param offset Pagination offset
     * @return List of role ownership results
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("owned-roles")
    @AllowAll
    public List<OwnershipResult> getOwnedRoles(
            @QueryParam("searchTerm") String searchTerm,
            @QueryParam("limit") @DefaultValue("25") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) throws GeneralException {
        
        SailPointContext context = SailPointFactory.getCurrentContext();
        List<OwnershipResult> results = new ArrayList<>();
        
        try {
            // Get the current user
            Identity currentUser = context.getObjectByName(Identity.class, getLoggedInUserName());
            if (currentUser == null) {
                log.error("Current user not found: " + getLoggedInUserName());
                return results;
            }
            
            // Create query options to find roles owned by current user
            QueryOptions qo = new QueryOptions();
            Filter ownerFilter = Filter.eq("owner.id", currentUser.getId());
            Filter typeFilter = Filter.eq("type", "role");
            
            // Combine filters
            Filter combinedFilter = Filter.and(ownerFilter, typeFilter);
            
            // Add search filter if a search term is provided
            if (searchTerm != null && !searchTerm.isEmpty()) {
                Filter nameFilter = Filter.ilike("name", "%" + searchTerm + "%");
                combinedFilter = Filter.and(combinedFilter, nameFilter);
            }
            
            qo.addFilter(combinedFilter);
            
            // Set pagination
            qo.setFirstRow(offset);
            qo.setMaxRows(limit);
            
            // Execute query
            List<Bundle> roles = context.getObjects(Bundle.class, qo);
            
            // Convert to OwnershipResult objects
            for (Bundle role : roles) {
                OwnershipResult result = new OwnershipResult();
                result.setId(role.getId());
                result.setDisplayName(role.getName());
                result.setDescription(role.getDescription());
                result.setOwnershipType(Type.ROLE);
                
                // Add additional role details as needed
                results.add(result);
            }
            
        } catch (Exception e) {
            log.error("Error getting owned roles", e);
            throw new GeneralException("Error getting owned roles", e);
        }
        
        return results;
    }
    
    /**
     * Gets all owned items (both entitlements and roles)
     * @param searchTerm Optional search term to filter results
     * @param limit Maximum number of results to return
     * @param offset Pagination offset
     * @return List of ownership results
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("owned-items")
    @AllowAll
    public List<OwnershipResult> getOwnedItems(
            @QueryParam("searchTerm") String searchTerm,
            @QueryParam("limit") @DefaultValue("25") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) throws GeneralException {
        
        List<OwnershipResult> results = new ArrayList<>();
        
        // Get entitlements
        List<OwnershipResult> entitlements = getOwnedEntitlements(searchTerm, limit, offset);
        results.addAll(entitlements);
        
        // If we have fewer entitlements than the limit, also get roles
        if (entitlements.size() < limit) {
            int remainingLimit = limit - entitlements.size();
            List<OwnershipResult> roles = getOwnedRoles(searchTerm, remainingLimit, 0);
            results.addAll(roles);
        }
        
        return results;
    }
    
    /**
     * Gets the details of a specific entitlement
     * @param entitlementId ID of the entitlement to retrieve
     * @return Entitlement details
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("entitlements/{id}")
    @AllowAll
    public OwnershipResult getEntitlementDetails(
            @PathParam("id") String entitlementId) throws GeneralException {
        
        SailPointContext context = SailPointFactory.getCurrentContext();
        
        try {
            ManagedAttribute entitlement = context.getObjectById(ManagedAttribute.class, entitlementId);
            if (entitlement == null) {
                throw new NotFoundException("Entitlement not found: " + entitlementId);
            }
            
            OwnershipResult result = new OwnershipResult();
            result.setId(entitlement.getId());
            result.setDisplayName(entitlement.getDisplayableName());
            result.setApplication(entitlement.getApplication().getName());
            result.setDescription(entitlement.getDescription());
            result.setOwnershipType(Type.ENTITLEMENT);
            
            // Add additional entitlement details as needed
            
            return result;
            
        } catch (Exception e) {
            log.error("Error getting entitlement details for ID: " + entitlementId, e);
            throw new GeneralException("Error getting entitlement details", e);
        }
    }
    
    /**
     * Gets the details of a specific role
     * @param roleId ID of the role to retrieve
     * @return Role details
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("roles/{id}")
    @AllowAll
    public OwnershipResult getRoleDetails(
            @PathParam("id") String roleId) throws GeneralException {
        
        SailPointContext context = SailPointFactory.getCurrentContext();
        
        try {
            Bundle role = context.getObjectById(Bundle.class, roleId);
            if (role == null) {
                throw new NotFoundException("Role not found: " + roleId);
            }
            
            OwnershipResult result = new OwnershipResult();
            result.setId(role.getId());
            result.setDisplayName(role.getName());
            result.setDescription(role.getDescription());
            result.setOwnershipType(Type.ROLE);
            
            // Add additional role details as needed
            
            return result;
            
        } catch (Exception e) {
            log.error("Error getting role details for ID: " + roleId, e);
            throw new GeneralException("Error getting role details", e);
        }
    }
    
    /**
     * Gets details for a specific item (entitlement or role)
     * @param itemId ID of the item to retrieve
     * @param type Type of item (ENTITLEMENT or ROLE)
     * @return Item details
     * @throws GeneralException if an error occurs
     */
    @GET
    @Path("items/{id}")
    @AllowAll
    public OwnershipResult getItemDetails(
            @PathParam("id") String itemId,
            @QueryParam("type") @DefaultValue("ENTITLEMENT") String type) throws GeneralException {
        
        Type ownershipType = Type.valueOf(type.toUpperCase());
        
        switch (ownershipType) {
            case ENTITLEMENT:
                return getEntitlementDetails(itemId);
            case ROLE:
                return getRoleDetails(itemId);
            default:
                throw new IllegalArgumentException("Unsupported ownership type: " + type);
        }
    }
}