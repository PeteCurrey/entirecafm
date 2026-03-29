import { 
  Shield, Lightbulb, Flame, Droplets, CloudRain, Wind, Thermometer, 
  ArrowUp, Package, Zap, Battery, Lock, Camera, ArrowDown, Home, TreePine
} from 'lucide-react';

export const assetCategories = [
  { name: 'Fire Alarm System', icon: Shield, color: 'text-red-500' },
  { name: 'Emergency Lighting', icon: Lightbulb, color: 'text-amber-500' },
  { name: 'Fire Extinguisher', icon: Flame, color: 'text-red-500' },
  { name: 'Dry Riser', icon: Droplets, color: 'text-blue-500' },
  { name: 'Sprinkler System', icon: CloudRain, color: 'text-blue-500' },
  { name: 'HVAC / Air Conditioning', icon: Wind, color: 'text-cyan-500' },
  { name: 'Commercial Boiler', icon: Flame, color: 'text-orange-500' },
  { name: 'Chiller Unit', icon: Thermometer, color: 'text-blue-500' },
  { name: 'Cooling Tower', icon: Wind, color: 'text-slate-500' },
  { name: 'Passenger Lift', icon: ArrowUp, color: 'text-purple-500' },
  { name: 'Goods Lift', icon: Package, color: 'text-purple-500' },
  { name: 'Electrical Distribution', icon: Zap, color: 'text-yellow-500' },
  { name: 'Water System', icon: Droplets, color: 'text-blue-500' },
  { name: 'Generator', icon: Battery, color: 'text-green-500' },
  { name: 'Access Control', icon: Lock, color: 'text-gray-500' },
  { name: 'CCTV System', icon: Camera, color: 'text-gray-500' },
  { name: 'Drainage', icon: ArrowDown, color: 'text-slate-500' },
  { name: 'Roof', icon: Home, color: 'text-stone-500' },
  { name: 'Grounds / External', icon: TreePine, color: 'text-green-500' },
];

export const getCategoryInfo = (name: string) => {
  return assetCategories.find(c => c.name === name) || { name: name, icon: Shield, color: 'text-gray-500' };
};
