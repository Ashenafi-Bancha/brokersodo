/** BrokerSodo — Tailwind theme extension */
module.exports = {
  theme: {
    extend: {
      colors: {
        broker: {
          red:    { 50:'#FDEBEC',100:'#FAD2D5',200:'#F5A5AA',300:'#EF747B',400:'#E93D47',500:'#E30613',600:'#C50715',700:'#A20816',800:'#7F0A18',900:'#5C0B1A', DEFAULT:'#E30613' },
          yellow: { 50:'#FFFAEC',100:'#FFF4D4',200:'#FFE9A8',300:'#FFDD78',400:'#FFCF43',500:'#FFC20E',600:'#E6AD0C',700:'#C4910A',800:'#A17307',900:'#7E5605', DEFAULT:'#FFC20E' },
          amber:  { 50:'#FEF7EB',100:'#FDEED3',200:'#FBDCA7',300:'#F9C976',400:'#F7B341',500:'#F59E0B',600:'#D48A0E',700:'#AE7311',800:'#895C14',900:'#634517', DEFAULT:'#F59E0B' },
          blue:   { 50:'#EEF1F6',100:'#D9DEEB',200:'#B4BED7',300:'#8A9AC0',400:'#5C72A8',500:'#2E4A8F',600:'#29427F',700:'#23386D',800:'#1D2E5B',900:'#182549', DEFAULT:'#2E4A8F' },
          navy:   { 50:'#F3F4F5',100:'#E5E6EA',200:'#C5C8D0',300:'#9FA4B1',400:'#747B8E',500:'#505971',600:'#353F5C',700:'#222D4D',800:'#172344',900:'#0F1B3D', DEFAULT:'#0F1B3D' },
          sold: '#15803D', reserved: '#B45309', error: '#DC2626', info: '#2563EB',
          'dark-red': '#FF4D57', muted: '#AEB6CC'
        }
      },
      fontFamily: {
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        ethiopic: ['"Noto Sans Ethiopic"', 'Inter', 'sans-serif']
      },
      fontSize: {
        h1: ['56px', { lineHeight: '60px', fontWeight: '900' }],
        h2: ['40px', { lineHeight: '46px', fontWeight: '900' }],
        h3: ['30px', { lineHeight: '36px', fontWeight: '800' }],
        price: ['36px', { lineHeight: '40px', fontWeight: '900' }]
      },
      borderRadius: { btn: '12px', card: '18px' },
      backgroundImage: { 'broker-gradient': 'linear-gradient(90deg, #E30613 0%, #F59E0B 55%, #FFC20E 100%)' },
      boxShadow: { card: '0 1px 2px rgba(15,27,61,.06), 0 8px 24px rgba(15,27,61,.06)', pop: '0 20px 40px rgba(15,27,61,.18)' }
    }
  }
};
