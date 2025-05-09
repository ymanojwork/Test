package com.sailpoint.plugin.myentitlementsandroles.model;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Model class representing an ownership result for entitlements and roles.
 * Contains information about an item (entitlement or role) and its ownership.
 */
public class OwnershipResult {

    /**
     * Enum representing the type of ownership item.
     */
    public enum Type {
        ENTITLEMENT,
        ROLE
    }

    private String id;
    private String displayName;
    private String application;
    private String description;
    private Type ownershipType;
    private Date ownershipDate;
    private Map<String, Object> additionalAttributes = new HashMap<>();

    /**
     * Default constructor
     */
    public OwnershipResult() {
    }

    /**
     * Gets the item ID
     * @return The item ID
     */
    public String getId() {
        return id;
    }

    /**
     * Sets the item ID
     * @param id The item ID
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * Gets the display name of the item
     * @return The display name
     */
    public String getDisplayName() {
        return displayName;
    }

    /**
     * Sets the display name of the item
     * @param displayName The display name
     */
    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    /**
     * Gets the application name the item belongs to
     * Only applicable for entitlements
     * @return The application name
     */
    public String getApplication() {
        return application;
    }

    /**
     * Sets the application name the item belongs to
     * @param application The application name
     */
    public void setApplication(String application) {
        this.application = application;
    }

    /**
     * Gets the description of the item
     * @return The description
     */
    public String getDescription() {
        return description;
    }

    /**
     * Sets the description of the item
     * @param description The description
     */
    public void setDescription(String description) {
        this.description = description;
    }

    /**
     * Gets the ownership type (ENTITLEMENT or ROLE)
     * @return The ownership type
     */
    public Type getOwnershipType() {
        return ownershipType;
    }

    /**
     * Sets the ownership type
     * @param ownershipType The ownership type
     */
    public void setOwnershipType(Type ownershipType) {
        this.ownershipType = ownershipType;
    }

    /**
     * Gets the date when the ownership was established
     * @return The ownership date
     */
    public Date getOwnershipDate() {
        return ownershipDate;
    }

    /**
     * Sets the date when the ownership was established
     * @param ownershipDate The ownership date
     */
    public void setOwnershipDate(Date ownershipDate) {
        this.ownershipDate = ownershipDate;
    }

    /**
     * Gets any additional attributes associated with this item
     * @return Map of additional attributes
     */
    public Map<String, Object> getAdditionalAttributes() {
        return additionalAttributes;
    }

    /**
     * Sets additional attributes
     * @param additionalAttributes Map of additional attributes
     */
    public void setAdditionalAttributes(Map<String, Object> additionalAttributes) {
        this.additionalAttributes = additionalAttributes;
    }

    /**
     * Adds a single additional attribute
     * @param key The attribute key
     * @param value The attribute value
     */
    public void addAdditionalAttribute(String key, Object value) {
        this.additionalAttributes.put(key, value);
    }
}