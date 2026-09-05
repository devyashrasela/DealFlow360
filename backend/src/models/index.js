import { Sequelize } from 'sequelize';
import sequelize from '../config/db.js';

// Domain Models
import { Organization, User, OrganizationMembership, CustomerAccount } from './auth.models.js';
import { Product, ProductVariant, PriceList, PriceListItem, UpsellRule, ProductAttachment } from './catalog.models.js';
import { DiscountTierCeiling, CategoryCeiling, ApprovalChain, ApprovalRule } from './governance.models.js';
import { Quotation, QuotationLine, NegotiationThread, QuotationApproval, ApprovalAuditLog } from './quotation.models.js';
import { Warehouse, WarehouseStock, FulfillmentOrder, FulfillmentItem, Backorder } from './fulfillment.models.js';
import { Subscription, SubscriptionLineItem, BillingSchedule, SubscriptionEvent } from './subscription.models.js';
import { Invoice, InvoiceLine, Payment, CreditAllocation } from './ledger.models.js';
import { DealHealthAlert, RepDiscountBaseline } from './dealHealth.models.js';

// ==========================================
// RELATIONAL ASSOCIATIONS
// ==========================================

// 1. Identity & Tenancy Associations
Organization.hasMany(OrganizationMembership, { foreignKey: 'organization_id', as: 'memberships' });
OrganizationMembership.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

User.hasMany(OrganizationMembership, { foreignKey: 'user_id', as: 'memberships' });
OrganizationMembership.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Organization.hasMany(CustomerAccount, { foreignKey: 'provider_organization_id', as: 'provided_accounts' });
CustomerAccount.belongsTo(Organization, { foreignKey: 'provider_organization_id', as: 'provider_organization' });

Organization.hasMany(CustomerAccount, { foreignKey: 'buyer_organization_id', as: 'buyer_accounts' });
CustomerAccount.belongsTo(Organization, { foreignKey: 'buyer_organization_id', as: 'buyer_organization' });

User.hasMany(CustomerAccount, { foreignKey: 'assigned_sales_rep_id', as: 'assigned_customer_accounts' });
CustomerAccount.belongsTo(User, { foreignKey: 'assigned_sales_rep_id', as: 'assigned_sales_rep' });

// 2. Catalog & Pricing Associations
Organization.hasMany(Product, { foreignKey: 'organization_id', as: 'products' });
Product.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Organization.hasMany(PriceList, { foreignKey: 'organization_id', as: 'price_lists' });
PriceList.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

PriceList.hasMany(PriceListItem, { foreignKey: 'price_list_id', as: 'items' });
PriceListItem.belongsTo(PriceList, { foreignKey: 'price_list_id', as: 'price_list' });

Product.hasMany(PriceListItem, { foreignKey: 'product_id', as: 'price_list_items' });
PriceListItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(PriceListItem, { foreignKey: 'product_variant_id', as: 'price_list_items' });
PriceListItem.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'product_variant' });

Product.hasMany(UpsellRule, { foreignKey: 'trigger_product_id', as: 'triggered_upsells' });
UpsellRule.belongsTo(Product, { foreignKey: 'trigger_product_id', as: 'trigger_product' });

Product.hasMany(UpsellRule, { foreignKey: 'recommended_product_id', as: 'recommended_upsells' });
UpsellRule.belongsTo(Product, { foreignKey: 'recommended_product_id', as: 'recommended_product' });

Product.hasMany(ProductAttachment, { foreignKey: 'parent_product_id', as: 'required_attachments' });
ProductAttachment.belongsTo(Product, { foreignKey: 'parent_product_id', as: 'parent_product' });

Product.hasMany(ProductAttachment, { foreignKey: 'attached_product_id', as: 'attached_in' });
ProductAttachment.belongsTo(Product, { foreignKey: 'attached_product_id', as: 'attached_product' });

// 3. Governance Associations
Organization.hasMany(DiscountTierCeiling, { foreignKey: 'organization_id', as: 'tier_ceilings' });
DiscountTierCeiling.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(CategoryCeiling, { foreignKey: 'organization_id', as: 'category_ceilings' });
CategoryCeiling.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(ApprovalChain, { foreignKey: 'organization_id', as: 'approval_chains' });
ApprovalChain.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

ApprovalChain.hasMany(ApprovalRule, { foreignKey: 'approval_chain_id', as: 'rules' });
ApprovalRule.belongsTo(ApprovalChain, { foreignKey: 'approval_chain_id', as: 'approval_chain' });

// 4. Quotations & Negotiation Associations
Organization.hasMany(Quotation, { foreignKey: 'organization_id', as: 'quotations' });
Quotation.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

CustomerAccount.hasMany(Quotation, { foreignKey: 'customer_account_id', as: 'quotations' });
Quotation.belongsTo(CustomerAccount, { foreignKey: 'customer_account_id', as: 'customer_account' });

User.hasMany(Quotation, { foreignKey: 'assigned_sales_rep_id', as: 'authored_quotations' });
Quotation.belongsTo(User, { foreignKey: 'assigned_sales_rep_id', as: 'sales_rep' });

PriceList.hasMany(Quotation, { foreignKey: 'price_list_id', as: 'quotations' });
Quotation.belongsTo(PriceList, { foreignKey: 'price_list_id', as: 'price_list' });

Quotation.hasMany(QuotationLine, { foreignKey: 'quotation_id', as: 'lines' });
QuotationLine.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

Product.hasMany(QuotationLine, { foreignKey: 'product_id', as: 'quoted_lines' });
QuotationLine.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(QuotationLine, { foreignKey: 'product_variant_id', as: 'quoted_lines' });
QuotationLine.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'product_variant' });

Quotation.hasMany(NegotiationThread, { foreignKey: 'quotation_id', as: 'negotiation_threads' });
NegotiationThread.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

QuotationLine.hasMany(NegotiationThread, { foreignKey: 'quotation_line_id', as: 'negotiation_threads' });
NegotiationThread.belongsTo(QuotationLine, { foreignKey: 'quotation_line_id', as: 'quotation_line' });

User.hasMany(NegotiationThread, { foreignKey: 'author_user_id', as: 'authored_negotiations' });
NegotiationThread.belongsTo(User, { foreignKey: 'author_user_id', as: 'author' });

Quotation.hasMany(QuotationApproval, { foreignKey: 'quotation_id', as: 'approvals' });
QuotationApproval.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

User.hasMany(QuotationApproval, { foreignKey: 'assigned_user_id', as: 'assigned_approvals' });
QuotationApproval.belongsTo(User, { foreignKey: 'assigned_user_id', as: 'assigned_reviewer' });

User.hasMany(QuotationApproval, { foreignKey: 'action_by_user_id', as: 'actioned_approvals' });
QuotationApproval.belongsTo(User, { foreignKey: 'action_by_user_id', as: 'action_by' });

Quotation.hasMany(ApprovalAuditLog, { foreignKey: 'quotation_id', as: 'audit_logs' });
ApprovalAuditLog.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

User.hasMany(ApprovalAuditLog, { foreignKey: 'actor_user_id', as: 'audit_logs' });
ApprovalAuditLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });

// 5. Fulfillment & Logistics Associations
Organization.hasMany(Warehouse, { foreignKey: 'organization_id', as: 'warehouses' });
Warehouse.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Warehouse.hasMany(WarehouseStock, { foreignKey: 'warehouse_id', as: 'stocks' });
WarehouseStock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

Product.hasMany(WarehouseStock, { foreignKey: 'product_id', as: 'warehouse_stocks' });
WarehouseStock.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(WarehouseStock, { foreignKey: 'product_variant_id', as: 'warehouse_stocks' });
WarehouseStock.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'product_variant' });

Organization.hasMany(FulfillmentOrder, { foreignKey: 'organization_id', as: 'fulfillment_orders' });
FulfillmentOrder.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Quotation.hasMany(FulfillmentOrder, { foreignKey: 'quotation_id', as: 'fulfillment_orders' });
FulfillmentOrder.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

Warehouse.hasMany(FulfillmentOrder, { foreignKey: 'warehouse_id', as: 'dispatched_orders' });
FulfillmentOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

FulfillmentOrder.hasMany(FulfillmentItem, { foreignKey: 'fulfillment_order_id', as: 'items' });
FulfillmentItem.belongsTo(FulfillmentOrder, { foreignKey: 'fulfillment_order_id', as: 'fulfillment_order' });

QuotationLine.hasMany(FulfillmentItem, { foreignKey: 'quotation_line_id', as: 'fulfillment_items' });
FulfillmentItem.belongsTo(QuotationLine, { foreignKey: 'quotation_line_id', as: 'quotation_line' });

Product.hasMany(FulfillmentItem, { foreignKey: 'product_id', as: 'fulfillment_items' });
FulfillmentItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Quotation.hasMany(Backorder, { foreignKey: 'quotation_id', as: 'backorders' });
Backorder.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

QuotationLine.hasMany(Backorder, { foreignKey: 'quotation_line_id', as: 'backorders' });
Backorder.belongsTo(QuotationLine, { foreignKey: 'quotation_line_id', as: 'quotation_line' });

Product.hasMany(Backorder, { foreignKey: 'product_id', as: 'backorders' });
Backorder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Warehouse.hasMany(Backorder, { foreignKey: 'target_warehouse_id', as: 'designated_backorders' });
Backorder.belongsTo(Warehouse, { foreignKey: 'target_warehouse_id', as: 'target_warehouse' });

FulfillmentOrder.hasMany(Backorder, { foreignKey: 'resolved_fulfillment_order_id', as: 'resolved_backorders' });
Backorder.belongsTo(FulfillmentOrder, { foreignKey: 'resolved_fulfillment_order_id', as: 'resolved_fulfillment_order' });

// 6. Subscriptions & Schedules Associations
Organization.hasMany(Subscription, { foreignKey: 'organization_id', as: 'subscriptions' });
Subscription.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

CustomerAccount.hasMany(Subscription, { foreignKey: 'customer_account_id', as: 'subscriptions' });
Subscription.belongsTo(CustomerAccount, { foreignKey: 'customer_account_id', as: 'customer_account' });

Quotation.hasMany(Subscription, { foreignKey: 'origin_quotation_id', as: 'spawned_subscriptions' });
Subscription.belongsTo(Quotation, { foreignKey: 'origin_quotation_id', as: 'origin_quotation' });

Subscription.hasMany(SubscriptionLineItem, { foreignKey: 'subscription_id', as: 'lines' });
SubscriptionLineItem.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

Product.hasMany(SubscriptionLineItem, { foreignKey: 'product_id', as: 'subscription_lines' });
SubscriptionLineItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Subscription.hasMany(BillingSchedule, { foreignKey: 'subscription_id', as: 'billing_schedules' });
BillingSchedule.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

Subscription.hasMany(SubscriptionEvent, { foreignKey: 'subscription_id', as: 'events' });
SubscriptionEvent.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

User.hasMany(SubscriptionEvent, { foreignKey: 'actor_user_id', as: 'performed_subscription_events' });
SubscriptionEvent.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });

// 7. Ledger, Invoices & Payments Associations
Organization.hasMany(Invoice, { foreignKey: 'organization_id', as: 'invoices' });
Invoice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

CustomerAccount.hasMany(Invoice, { foreignKey: 'customer_account_id', as: 'invoices' });
Invoice.belongsTo(CustomerAccount, { foreignKey: 'customer_account_id', as: 'customer_account' });

Quotation.hasMany(Invoice, { foreignKey: 'origin_quotation_id', as: 'invoices' });
Invoice.belongsTo(Quotation, { foreignKey: 'origin_quotation_id', as: 'origin_quotation' });

Subscription.hasMany(Invoice, { foreignKey: 'origin_subscription_id', as: 'invoices' });
Invoice.belongsTo(Subscription, { foreignKey: 'origin_subscription_id', as: 'origin_subscription' });

Invoice.hasMany(InvoiceLine, { foreignKey: 'invoice_id', as: 'lines' });
InvoiceLine.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

Product.hasMany(InvoiceLine, { foreignKey: 'product_id', as: 'invoiced_lines' });
InvoiceLine.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

CustomerAccount.hasMany(Payment, { foreignKey: 'customer_account_id', as: 'payments' });
Payment.belongsTo(CustomerAccount, { foreignKey: 'customer_account_id', as: 'customer_account' });

User.hasMany(Payment, { foreignKey: 'recorded_by_user_id', as: 'recorded_payments' });
Payment.belongsTo(User, { foreignKey: 'recorded_by_user_id', as: 'recorded_by' });

Invoice.hasMany(CreditAllocation, { foreignKey: 'credit_note_invoice_id', as: 'disbursed_credit_allocations' });
CreditAllocation.belongsTo(Invoice, { foreignKey: 'credit_note_invoice_id', as: 'credit_note_invoice' });

Invoice.hasMany(CreditAllocation, { foreignKey: 'target_invoice_id', as: 'received_credit_allocations' });
CreditAllocation.belongsTo(Invoice, { foreignKey: 'target_invoice_id', as: 'target_invoice' });

User.hasMany(CreditAllocation, { foreignKey: 'allocated_by_user_id', as: 'authorized_credit_allocations' });
CreditAllocation.belongsTo(User, { foreignKey: 'allocated_by_user_id', as: 'allocated_by' });

// 8. Deal Health Associations
Organization.hasMany(DealHealthAlert, { foreignKey: 'organization_id', as: 'deal_health_alerts' });
DealHealthAlert.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Quotation.hasMany(DealHealthAlert, { foreignKey: 'quotation_id', as: 'alerts' });
DealHealthAlert.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });

FulfillmentOrder.hasMany(DealHealthAlert, { foreignKey: 'fulfillment_order_id', as: 'alerts' });
DealHealthAlert.belongsTo(FulfillmentOrder, { foreignKey: 'fulfillment_order_id', as: 'fulfillment_order' });

User.hasMany(DealHealthAlert, { foreignKey: 'resolved_by_user_id', as: 'resolved_alerts' });
DealHealthAlert.belongsTo(User, { foreignKey: 'resolved_by_user_id', as: 'resolved_by' });

Organization.hasMany(RepDiscountBaseline, { foreignKey: 'organization_id', as: 'rep_baselines' });
RepDiscountBaseline.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

User.hasOne(RepDiscountBaseline, { foreignKey: 'sales_rep_id', as: 'discount_baseline' });
RepDiscountBaseline.belongsTo(User, { foreignKey: 'sales_rep_id', as: 'sales_rep' });

const db = {
  sequelize,
  Sequelize,
  // Auth
  Organization,
  User,
  OrganizationMembership,
  CustomerAccount,
  // Catalog
  Product,
  ProductVariant,
  PriceList,
  PriceListItem,
  UpsellRule,
  ProductAttachment,
  // Governance
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule,
  // Quotation
  Quotation,
  QuotationLine,
  NegotiationThread,
  QuotationApproval,
  ApprovalAuditLog,
  // Fulfillment
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  // Subscriptions
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  // Ledger
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  // Diagnostics
  DealHealthAlert,
  RepDiscountBaseline,
};

export default db;
export {
  sequelize,
  Sequelize,
  Organization,
  User,
  OrganizationMembership,
  CustomerAccount,
  Product,
  ProductVariant,
  PriceList,
  PriceListItem,
  UpsellRule,
  ProductAttachment,
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule,
  Quotation,
  QuotationLine,
  NegotiationThread,
  QuotationApproval,
  ApprovalAuditLog,
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  DealHealthAlert,
  RepDiscountBaseline,
};
