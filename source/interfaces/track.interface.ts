// Import the 'Document' and 'Types' interfaces from mongoose module
import { Document, Types } from 'mongoose';

// Creates an interface for Track model with attributes asset_acquired, slug, countries, disbursed_dividends and created_by
export interface ITrack {
  asset_acquired: string;
  countries: string;
  disbursed_dividends: string;
  created_by: Types.ObjectId;
}

// Creates an interface which is a combination of document and ITrack interface
export interface ITrackDocument extends Document, ITrack {}
