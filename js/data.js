window.APP_DATA = {
  summary: {
    length: 328,
    lengthPrevious: 245,
    excavations: 12,
    excavationsPrevious: 9,
    teams: 3,
    personnel: 14,
    pending: 8,
    pendingToday: 3
  },

  projects: [
    {
      id: 'merzifon-su',
      title: 'Merzifon İçme Suyu',
      location: 'Merzifon, Amasya',
      province: 'Amasya',
      district: 'Merzifon',
      type: 'İçme Suyu Hattı',
      status: 'ongoing',
      statusLabel: 'Devam Ediyor',
      progress: 62,
      length: '12,4 km',
      total: '20 km',
      personnel: 14,
      days: 320,
      thumb: 'assets/city.svg',
      contractor: 'Amasya Su Altyapı A.Ş.',
      startDate: '12 Mar 2025',
      description: 'Merzifon merkez ve kuzey mahallelerinde 20 km içme suyu hattı yenileme ve yeni abone bağlantıları imalatı.'
    },
    {
      id: 'erbaa-kanal',
      title: 'Erbaa Kanalizasyon',
      location: 'Erbaa, Tokat',
      province: 'Tokat',
      district: 'Erbaa',
      type: 'Kanalizasyon Hattı',
      status: 'planned',
      statusLabel: 'Planlanıyor',
      progress: 18,
      length: '8,6 km',
      total: '47 km',
      personnel: 9,
      days: 480,
      thumb: 'assets/canal.svg',
      contractor: 'Tokat Çevre İnşaat Ltd. Şti.',
      startDate: '04 Nis 2025',
      description: 'Erbaa ilçe merkezinde 47 km kanalizasyon hattı, muayene bacası ve terfi merkezi yapım işi.'
    },
    {
      id: 'tokat-yagmur',
      title: 'Tokat Yağmur Suyu',
      location: 'Tokat, Tokat',
      province: 'Tokat',
      district: 'Tokat',
      type: 'Yağmur Suyu Hattı',
      status: 'paused',
      statusLabel: 'Duraklatıldı',
      progress: 35,
      length: '6,2 km',
      total: '18 km',
      personnel: 8,
      days: 210,
      thumb: 'assets/rain.svg',
      contractor: 'Yeşilırmak Altyapı Ltd.',
      startDate: '18 Şub 2025',
      description: 'Tokat kent merkezinde yağmur suyu toplama hattı ve yağmur suyu deşarj yapıları imalatı.'
    },
    {
      id: 'amasya-telekom',
      title: 'Amasya Telekom Altyapısı',
      location: 'Amasya, Amasya',
      province: 'Amasya',
      district: 'Amasya',
      type: 'Telekom Altyapısı',
      status: 'ongoing',
      statusLabel: 'Devam Ediyor',
      progress: 78,
      length: '15,0 km',
      total: '19 km',
      personnel: 11,
      days: 150,
      thumb: 'assets/telecom.svg',
      contractor: 'Anadolu Telekom A.Ş.',
      startDate: '07 Oca 2025',
      description: 'Amasya merkezde 19 km fiber optik altyapı kanalı, menhol ve bağlantı odaları yapım işi.'
    }
  ],

  records: [
    {
      label: 'Bugün',
      items: [
        {
          type: 'work',
          projectId: 'merzifon-su',
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
          projectId: 'merzifon-su',
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
          projectId: 'merzifon-su',
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
          projectId: 'erbaa-kanal',
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
          projectId: 'merzifon-su',
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
          projectId: 'merzifon-su',
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
          projectId: 'tokat-yagmur',
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
          projectId: 'erbaa-kanal',
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
          projectId: 'erbaa-kanal',
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
