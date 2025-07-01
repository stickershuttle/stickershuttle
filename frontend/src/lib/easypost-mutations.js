import { gql } from '@apollo/client';

export const CREATE_EASYPOST_SHIPMENT = gql`
  mutation CreateEasyPostShipment($orderId: ID!) {
    createEasyPostShipment(orderId: $orderId) {
      success
      error
      shipment {
        id
        rates {
          id
          carrier
          service
          rate
          currency
          delivery_days
          delivery_date
          delivery_date_guaranteed
        }
        to_address {
          name
          company
          street1
          street2
          city
          state
          zip
          country
          phone
          email
        }
        from_address {
          name
          company
          street1
          street2
          city
          state
          zip
          country
          phone
          email
        }
        parcel {
          length
          width
          height
          weight
        }
        reference
      }
    }
  }
`;

export const BUY_EASYPOST_LABEL = gql`
  mutation BuyEasyPostLabel($shipmentId: String!, $rateId: String!, $orderId: ID!, $insurance: String) {
    buyEasyPostLabel(shipmentId: $shipmentId, rateId: $rateId, orderId: $orderId, insurance: $insurance) {
      success
      error
      shipment {
        id
        tracking_code
        postage_label {
          id
          label_url
          label_file_type
          label_size
        }
        selected_rate {
          id
          carrier
          service
          rate
          currency
          delivery_days
          delivery_date
          delivery_date_guaranteed
        }
        tracker {
          id
          tracking_code
          carrier
          public_url
          status
          est_delivery_date
        }
      }
    }
  }
`;

export const GET_EASYPOST_LABEL = gql`
  mutation GetEasyPostLabel($trackingCode: String!) {
    getEasyPostLabel(trackingCode: $trackingCode) {
      success
      error
      labelUrl
      trackingCode
      carrier
    }
  }
`;

export const TRACK_EASYPOST_SHIPMENT = gql`
  mutation TrackEasyPostShipment($trackingCode: String!) {
    trackEasyPostShipment(trackingCode: $trackingCode) {
      success
      error
      tracker {
        id
        tracking_code
        carrier
        public_url
        status
        est_delivery_date
      }
    }
  }
`; 