package com.sailpoint.plugins.rest.vo;

public class EntitlementOwnershipResult {

    private String id;
    private String name;
    private String applicationName;
    private String attributeName;
    private String requestable;
    private String description;
    private String approvalScheme;
    private boolean hasRoles;
    private boolean isRole;
    private String displayName;
    private String type;
    private String displayValue;
    private String value;
    
    /**
     * @return the id
     */
    public String getId() {
        return id;
    }
    
    /**
     * @param id the id to set
     */
    public void setId(String id) {
        this.id = id;
    }
    
    /**
     * @return the name
     */
    public String getName() {
        return name;
    }
    
    /**
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }
    
    /**
     * @return the applicationName
     */
    public String getApplicationName() {
        return applicationName;
    }
    
    /**
     * @param applicationName the applicationName to set
     */
    public void setApplicationName(String applicationName) {
        this.applicationName = applicationName;
    }
    
    /**
     * @return the attributeName
     */
    public String getAttributeName() {
        return attributeName;
    }
    
    /**
     * @param attributeName the attributeName to set
     */
    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }
    
    
    /**
     * @return the displayName
     */
    public String getDisplayName() {
        return displayName;
    }
    
    /**
     * @param displayName the displayName to set
     */
    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
    
    /**
     * @return the type
     */
    public String getType() {
        return type;
    }
    
    /**
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }
    
}