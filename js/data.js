window.APP_DATA = {
  projects: [
    {
      id: 'merzifon-su',
      title: 'Merzifon İçme Suyu',
      location: 'Merzifon, Amasya',
      type: 'İçme Suyu Hattı',
      status: 'ongoing',
      statusLabel: 'Devam Ediyor',
      progress: 62,
      length: '12,4 km',
      total: '20 km',
      personnel: 14,
      days: 320,
      thumb: 'assets/city.svg'
    },
    {
      id: 'erbaa-kanal',
      title: 'Erbaa Kanalizasyon',
      location: 'Erbaa, Tokat',
      type: 'Kanalizasyon Hattı',
      status: 'planned',
      statusLabel: 'Planlanıyor',
      progress: 18,
      length: '8,6 km',
      total: '47 km',
      personnel: 9,
      days: 480,
      thumb: 'assets/canal.svg'
    },
    {
      id: 'tokat-yagmur',
      title: 'Tokat Yağmur Suyu',
      location: 'Tokat, Tokat',
      type: 'Yağmur Suyu Hattı',
      status: 'paused',
      statusLabel: 'Duraklatıldı',
      progress: 35,
      length: '6,2 km',
      total: '18 km',
      personnel: 8,
      days: 210,
      thumb: 'assets/rain.svg'
    },
    {
      id: 'amasya-telekom',
      title: 'Amasya Telekom Altyapısı',
      location: 'Amasya, Amasya',
      type: 'Telekom Altyapısı',
      status: 'ongoing',
      statusLabel: 'Devam Ediyor',
      progress: 78,
      length: '15,0 km',
      total: '19 km',
      personnel: 11,
      days: 150,
      thumb: 'assets/telecom.svg'
    }
  ],

  records: [
    {
      label: 'Bugün',
      items: [
        {
          type: 'work',
          title: 'İçme Suyu Hattı İmalatı',
          location: 'Kuzey Mahallesi, 124. Sokak',
          team: '1. Saha Ekibi (3 kişi)',
          time: '09:18',
          status: 'Tamamlandı',
          statusClass: 'completed',
          tone: 'blue',
          icon: 'i-droplet'
        },
        {
          type: 'service',
          title: 'Abone Bağlantısı',
          location: 'Mehmet Akif Ersoy Cad. No:18',
          team: '2. Saha Ekibi (2 kişi)',
          time: '11:42',
          status: 'Devam Ediyor',
          statusClass: 'ongoing',
          tone: 'green',
          icon: 'i-users'
        },
        {
          type: 'photo',
          title: 'Saha Fotoğrafı',
          location: 'Barış Mahallesi, 7. Sokak',
          team: '1. Saha Ekibi (3 kişi)',
          time: '16:27',
          status: 'Onay Bekliyor',
          statusClass: 'pending',
          tone: 'purple',
          icon: 'i-camera'
        }
      ]
    },
    {
      label: 'Dün',
      items: [
        {
          type: 'dig',
          title: 'Kazı Kapatma',
          location: 'Fatih Mahallesi, 12. Sokak',
          team: '3. Saha Ekibi (4 kişi)',
          time: 'Dün 14:35',
          status: 'Tamamlandı',
          statusClass: 'completed',
          tone: 'amber',
          icon: 'i-excavator'
        },
        {
          type: 'work',
          title: 'İçme Suyu Hattı İmalatı',
          location: 'Yavuz Selim Cad. No:56',
          team: '1. Saha Ekibi (3 kişi)',
          time: 'Dün 10:12',
          status: 'Sorun Var',
          statusClass: 'error',
          tone: 'blue',
          icon: 'i-droplet'
        }
      ]
    },
    {
      label: 'Bu Hafta',
      items: [
        {
          type: 'service',
          title: 'Abone Bağlantısı',
          location: 'Atatürk Mahallesi, 203. Sokak',
          team: '2. Saha Ekibi (2 kişi)',
          time: '15 Mar 2025',
          status: 'Tamamlandı',
          statusClass: 'completed',
          tone: 'green',
          icon: 'i-users'
        },
        {
          type: 'photo',
          title: 'Saha Fotoğrafı',
          location: 'Hürriyet Mahallesi, 88. Sokak',
          team: '1. Saha Ekibi (3 kişi)',
          time: '14 Mar 2025',
          status: 'Devam Ediyor',
          statusClass: 'ongoing',
          tone: 'purple',
          icon: 'i-camera'
        },
        {
          type: 'dig',
          title: 'Kazı İşlemi',
          location: 'Cumhuriyet Mahallesi, 5. Sokak',
          team: '3. Saha Ekibi (4 kişi)',
          time: '13 Mar 2025',
          status: 'Onay Bekliyor',
          statusClass: 'pending',
          tone: 'amber',
          icon: 'i-excavator'
        },
        {
          type: 'work',
          title: 'Kanalizasyon Hattı İmalatı',
          location: 'Sanayi Mahallesi, 18. Sokak',
          team: '2. Saha Ekibi (2 kişi)',
          time: '12 Mar 2025',
          status: 'Tamamlandı',
          statusClass: 'completed',
          tone: 'blue',
          icon: 'i-waves'
        }
      ]
    }
  ]
};
