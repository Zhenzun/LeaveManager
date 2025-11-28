/**
 * Menghitung Jumlah Hari Kerja (Senin - Jumat)
 * dengan mengecualikan tanggal merah dari Database.
 * * @param {string} startDateStr - Tanggal Mulai (YYYY-MM-DD)
 * @param {string} endDateStr - Tanggal Selesai (YYYY-MM-DD)
 * @param {Array} holidays - Array string tanggal merah ['2024-12-25', '2025-01-01']
 */
export const calculateWorkingDays = (startDateStr, endDateStr, holidays = []) => {
  if (!startDateStr || !endDateStr) return 0;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Validasi tanggal
  if (start > end) return 0;

  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Minggu, 6 = Sabtu
    
    // Konversi tanggal saat ini ke format string 'YYYY-MM-DD' untuk dicocokkan
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${date}`;

    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    // Cek apakah tanggal ini ada di list holidays yang diambil dari DB
    const isHoliday = holidays.includes(currentDateStr);

    // Hitung jika BUKAN Weekend DAN BUKAN Tanggal Merah
    if (!isWeekend && !isHoliday) {
      count++;
    }

    // Maju 1 hari
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const calculateQuotaByTenure = (joinDateStr) => {
    if (!joinDateStr) return 0; // Belum ada tanggal join = 0

    const joinDate = new Date(joinDateStr);
    const today = new Date();
    
    // Hitung selisih tahun
    let years = today.getFullYear() - joinDate.getFullYear();
    const m = today.getMonth() - joinDate.getMonth();
    
    // Koreksi jika belum ulang tahun masa kerja di tahun ini
    if (m < 0 || (m === 0 && today.getDate() < joinDate.getDate())) {
        years--;
    }

    // Aturan Perusahaan
    if (years < 1) return 0;
    if (years < 5) return 12;
    if (years < 10) return 18;
    return 24; // 10 Tahun ke atas
};