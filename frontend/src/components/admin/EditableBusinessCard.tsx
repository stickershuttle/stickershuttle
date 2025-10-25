import React, { useState } from 'react';
import { MapPin, Edit2, Check, X } from 'lucide-react';
import { FaTiktok, FaInstagram } from 'react-icons/fa';

interface EditableBusinessCardProps {
  business: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processing: string | null;
}

export default function EditableBusinessCard({ 
  business, 
  onApprove, 
  onReject, 
  processing 
}: EditableBusinessCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState(business);

  const handleSave = () => {
    // TODO: Add update mutation
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedBusiness(business);
    setIsEditing(false);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo Container */}
      <div
        className="w-full h-48 flex items-center justify-center p-8"
        style={{ backgroundColor: editedBusiness.logoBackgroundColor || '#9ca3af' }}
      >
        <img
          src={editedBusiness.logoUrl}
          alt={`${editedBusiness.companyName} logo`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Editable Company Name */}
        {isEditing ? (
          <input
            type="text"
            value={editedBusiness.companyName}
            onChange={(e) => setEditedBusiness({ ...editedBusiness, companyName: e.target.value })}
            className="w-full px-3 py-2 mb-2 rounded-lg text-white bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400"
            placeholder="Company Name"
          />
        ) : (
          <h3 className="text-xl font-bold text-left text-white mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>
            {business.companyName}
          </h3>
        )}

        {/* Category & Location */}
        {isEditing ? (
          <div className="mb-3 space-y-2">
            <select
              value={editedBusiness.category}
              onChange={(e) => setEditedBusiness({ ...editedBusiness, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-white bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400 text-sm"
            >
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Creative Services">Creative Services</option>
              <option value="Health & Wellness">Health & Wellness</option>
              <option value="Technology">Technology</option>
              <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
              <option value="Retail">Retail</option>
              <option value="Pet Services">Pet Services</option>
            </select>
            <input
              type="text"
              value={editedBusiness.state}
              onChange={(e) => setEditedBusiness({ ...editedBusiness, state: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-white bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400 text-sm"
              placeholder="State"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
              {business.category}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-700/30 text-gray-300">
              <MapPin className="w-3 h-3" />
              {business.state}
            </span>
          </div>
        )}

        {/* Editable Bio */}
        {isEditing ? (
          <textarea
            value={editedBusiness.bio}
            onChange={(e) => setEditedBusiness({ ...editedBusiness, bio: e.target.value })}
            className="w-full px-3 py-2 mb-4 rounded-lg text-white bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400 resize-none text-sm"
            rows={3}
            maxLength={150}
            placeholder="Business description (max 150 characters)"
          />
        ) : (
          <p className="text-gray-300 text-left mb-4 min-h-[4rem]">
            {business.bio}
          </p>
        )}

        {/* Social Links */}
        <div className="flex items-center gap-3 mb-4">
          {business.instagramHandle && (
            <a
              href={`https://instagram.com/${business.instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-pink-400 transition-colors"
            >
              <FaInstagram className="w-4 h-4" />
              {business.instagramHandle}
            </a>
          )}
          {business.tiktokHandle && (
            <a
              href={`https://tiktok.com/@${business.tiktokHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <FaTiktok className="w-4 h-4" />
              {business.tiktokHandle}
            </a>
          )}
          {business.websiteUrl && (
            <a
              href={business.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Visit Website
            </a>
          )}
        </div>

        {/* Discount Info */}
        <div className="mb-4 p-3 rounded-lg bg-gray-800/30">
          <p className="text-xs text-gray-400 mb-1">Discount Offer</p>
          <p className="text-sm font-semibold text-white">
            {business.discountType === 'percentage' && `${business.discountAmount}% Off`}
            {business.discountType === 'credit' && `$${business.discountAmount} Store Credit`}
            {business.discountType === 'shipping' && 'Free Shipping'}
            {business.discountType === 'bogo' && 'Buy One Get One'}
          </p>
        </div>

        {/* Submitted Info */}
        <div className="mb-4 text-xs text-gray-400">
          <p>Submitted: {new Date(business.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer bg-blue-500/20 border border-blue-500/40 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer bg-gray-700/30 border border-gray-600/40 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 rounded-lg font-semibold text-white transition-all duration-200 cursor-pointer bg-gray-700/30 border border-gray-600/40 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onApprove(business.id)}
                disabled={processing === business.id}
                className="flex-1 px-4 py-2 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6) 0%, rgba(22, 163, 74, 0.4) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                }}
              >
                {processing === business.id ? (
                  'Processing...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>

              <button
                onClick={() => onReject(business.id)}
                disabled={processing === business.id}
                className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.6) 0%, rgba(185, 28, 28, 0.4) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                }}
              >
                {processing === business.id ? (
                  '...'
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

