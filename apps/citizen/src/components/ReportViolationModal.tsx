'use client';

import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import { FUNCTIONS_BASE_URL, auth } from '../lib/firebase';
import {
  Camera,
  MapPin,
  AlertTriangle,
  X,
  Upload,
  CheckCircle2,
  ShieldAlert,
  Car
} from 'lucide-react';

interface ReportViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportViolationModal({ isOpen, onClose }: ReportViolationModalProps) {
  const { lang, t } = useI18n();
  const { selectedZone, bays } = useApp();

  const [violationType, setViolationType] = useState('unauthorized_parking');
  const [vehicleNumber, setVehicleNumber] = useState('DL08CD5544');
  const [selectedBayId, setSelectedBayId] = useState('');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setErrorMsg('Vehicle plate number is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/reportViolation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: selectedZone ? selectedZone.id : 'delhi-cp-inner',
          bayId: selectedBayId || 'unknown_bay',
          type: violationType,
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          photoUrl: photoPreview || 'https://via.placeholder.com/400x300.png?text=Violation+Photo',
          location: selectedZone ? selectedZone.location : { lat: 28.6328, lng: 77.2197 },
          notes: notes || 'Citizen report via ParkSense mobile PWA',
          reporterUserId: auth.currentUser?.uid || 'citizen-reporter'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }

      setIsSubmitting(false);
      setSuccessMsg(data.message || 'Report registered with Municipal Enforcement Squad.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Error sending report');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">{t.reportViolationTitle}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Direct alert to Delhi Municipal Enforcement Squad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-surface-card text-slate-400 hover:text-white border border-surface-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-white">Challan Alert Dispatched!</h3>
            <p className="text-xs text-emerald-300">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Photo Upload / Camera Preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {t.photoUpload}
              </label>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-surface-border max-h-40">
                  <img src={photoPreview} alt="Violation" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="min-h-[90px] border-2 border-dashed border-slate-700 hover:border-brand-saffron/60 rounded-2xl flex flex-col items-center justify-center p-3 cursor-pointer bg-surface-card/40 transition-all text-center">
                  <Camera className="w-6 h-6 text-brand-saffron mb-1" />
                  <span className="text-xs font-bold text-white">Capture / Upload Photo</span>
                  <span className="text-[10px] text-slate-400">
                    ANPR AI will verify license plate & slot
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Violation Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Violation Type
              </label>
              <select
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs font-semibold focus:border-brand-saffron focus:outline-none"
              >
                <option value="unauthorized_parking">Unauthorized Street Parking</option>
                <option value="blocking_passage">Blocking Traffic / Driveway</option>
                <option value="wrong_vehicle_type">Wrong Vehicle (e.g. Car in 2W/EV Slot)</option>
                <option value="overstay">Overstay / Non-Payment</option>
              </select>
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Offending Vehicle Plate
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="DL 01 AB 1234"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white font-mono font-bold text-xs uppercase focus:border-brand-saffron focus:outline-none"
              />
            </div>

            {/* GPS Geotag info */}
            <div className="p-2 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium truncate max-w-[220px]">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">
                  {selectedZone ? selectedZone.name : 'Connaught Place'}
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                GPS LOCKED
              </span>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-red-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Transmitting Geotag...
                </span>
              ) : (
                <span>{t.submitReport}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
