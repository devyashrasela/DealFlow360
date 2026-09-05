import React from 'react';
import { User, Building, MapPin, Mail, Phone, CreditCard, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CustomerProfilePage = () => {
  // Mock customer profile data for portal demonstration
  const profile = {
    legal_name: 'TechStart Inc.',
    contact_email: 'admin@techstart.io',
    phone: '+1 (555) 123-4567',
    address: '100 Innovation Drive, San Francisco, CA 94105',
    pricing_tier: 'gold',
    payment_terms: 'Net 30',
    credit_limit: 100000,
    active_users: 12,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Company Profile</h1>
        <p className="text-sm text-[#2E3141]/70 mt-1">Manage your organization details, billing settings, and users.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Info Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-neutral-200/60">
            <div className="flex justify-between items-start mb-6 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#724B66]/10 rounded-xl flex items-center justify-center border border-[#724B66]/20">
                  <Building className="w-8 h-8 text-[#724B66]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111826]">{profile.legal_name}</h2>
                  <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                    <Badge status="active" title="Active Account • In good standing">Active Account</Badge>
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="text-sm">Edit Details</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Primary Email
                </p>
                <p className="text-sm font-medium text-[#111826]">{profile.contact_email}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </p>
                <p className="text-sm font-medium text-[#111826]">{profile.phone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Billing Address
                </p>
                <p className="text-sm font-medium text-[#111826]">{profile.address}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-neutral-200/60">
            <h3 className="text-lg font-bold text-[#111826] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#724B66]" />
              Security & Users
            </h3>
            <div className="flex justify-between items-center p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
              <div>
                <p className="font-medium text-[#111826]">{profile.active_users} Active Users</p>
                <p className="text-sm text-neutral-500">Manage who has access to this portal.</p>
              </div>
              <Button variant="secondary">Manage Users</Button>
            </div>
          </div>
        </div>

        {/* Billing Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-neutral-200/60">
            <h3 className="text-lg font-bold text-[#111826] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#724B66]" />
              Billing Terms
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Pricing Tier</p>
                <Badge variant="tag" dot={false} title={`Pricing Tier: ${profile.pricing_tier}`} className="uppercase tracking-wider">{profile.pricing_tier}</Badge>
              </div>
              
              <div className="pt-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Payment Terms</p>
                <p className="text-sm font-medium text-[#111826]">{profile.payment_terms}</p>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Credit Limit</p>
                <p className="text-sm font-medium text-[#111826]">${profile.credit_limit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
