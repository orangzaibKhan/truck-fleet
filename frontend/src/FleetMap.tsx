import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export interface MapTruck {
  truckId: string;
  truckNumber: string;
  lat: number;
  lng: number;
  status: 'working' | 'idle' | 'signal_lost' | 'available';
  signalLostMinutesAgo?: number;
}

// Status -> marker treatment. "signal_lost" is deliberately distinct from idle/breakdown
// (dashed ring + warning badge) per the design review - a vanished truck should never read as a bug.
// Colors per the dataviz skill's validated palette: working=status-good, idle=muted ink
// (not a category), signal_lost=status-warning (paired with the badge icon below,
// never color alone), available=categorical slot 1 (neutral informational default).
const STATUS_COLOR: Record<MapTruck['status'], string> = {
  working: 'var(--status-good)',
  idle: 'var(--text-muted)',
  signal_lost: 'var(--status-warning)',
  available: 'var(--cat-1-blue)',
};

function buildIcon(truck: MapTruck): L.DivIcon {
  const color = STATUS_COLOR[truck.status];
  const dashed = truck.status === 'signal_lost';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px; height: 18px; border-radius: 50%;
        background: ${dashed ? 'transparent' : color};
        border: 3px ${dashed ? 'dashed' : 'solid'} ${color};
        box-shadow: 0 0 0 2px rgba(0,0,0,0.4);
      "></div>
      ${dashed ? `<div style="position:absolute; top:-4px; left:14px; font-size:14px;">⚠️</div>` : ''}
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function FleetMap({ trucks, center }: { trucks: MapTruck[]; center: [number, number] }) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trucks.map((truck) => (
        <Marker key={truck.truckId} position={[truck.lat, truck.lng]} icon={buildIcon(truck)}>
          <Popup>
            <strong>{truck.truckNumber}</strong>
            <br />
            {truck.status === 'signal_lost'
              ? `Signal lost ${Math.round(truck.signalLostMinutesAgo ?? 0)}m ago`
              : truck.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
