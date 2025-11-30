import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// Excel'den görev yükleme
export const parseTasksFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const validRows: any[] = [];
        const errors: string[] = [];
        
        rows.forEach((row: any, index) => {
          if (!row['GÖREV'] || !row['BİRİM'] || !row['PERİYOT']) {
            errors.push(`Satır ${index + 2}: Zorunlu alan eksik`);
            return;
          }
          
          const birim = row['BİRİM']?.toString().toLowerCase();
          if (!['istasyon', 'muhasebe', 'vardiya'].includes(birim)) {
            errors.push(`Satır ${index + 2}: Geçersiz birim "${row['BİRİM']}"`);
            return;
          }
          
          const periyot = row['PERİYOT']?.toString().toLowerCase();
          if (!['gunluk', 'haftalik', 'aylik', 'yillik'].includes(periyot)) {
            errors.push(`Satır ${index + 2}: Geçersiz periyot "${row['PERİYOT']}"`);
            return;
          }
          
          const frequencyMap: Record<string, string> = {
            'gunluk': 'daily',
            'haftalik': 'weekly', 
            'aylik': 'monthly',
            'yillik': 'yearly'
          };
          
          validRows.push({
            title: row['GÖREV'],
            description: row['AÇIKLAMA'] || '',
            department: birim,
            frequency: frequencyMap[periyot],
            requires_photo: row['BELGE']?.toString().toUpperCase() === 'EVET',
            is_active: true,
            is_custom: false
          });
        });
        
        if (errors.length > 0) {
          reject(errors);
          return;
        }
        
        resolve(validRows);
      } catch (err) {
        reject(['Excel dosyası okunamadı']);
      }
    };
    reader.onerror = () => reject(['Dosya okunamadı']);
    reader.readAsBinaryString(file);
  });
};

// Rapor Excel'i oluştur
export const exportReportToExcel = async () => {
  const { data: assignments } = await supabase
    .from('task_assignments')
    .select(`
      *,
      task:tasks(*),
      assigned_user:users!task_assignments_assigned_to_fkey(full_name, department),
      forwarded_user:users!task_assignments_forwarded_to_fkey(full_name)
    `)
    .order('assigned_date', { ascending: false });

  const frequencyLabels: Record<string, string> = {
    'daily': 'Günlük',
    'weekly': 'Haftalık', 
    'monthly': 'Aylık',
    'yearly': 'Yıllık',
    'once': 'Anlık'
  };

  const reportData = assignments?.map(a => {
    let sonuc = 'Bekliyor';
    if (a.status === 'completed') {
      sonuc = a.result === 'olumlu' ? 'Yapıldı' : 'Yapıldı (Olumsuz)';
    } else if (a.status === 'rejected') {
      sonuc = 'Revize';
    }
    
    return {
      'TARİH': new Date(a.assigned_date).toLocaleDateString('tr-TR'),
      'BİRİM': a.task?.department || '',
      'YETKİLİ': a.assigned_user?.full_name || '',
      'PERSONEL': a.forwarded_user?.full_name || '-',
      'PERİYOT': frequencyLabels[a.task?.frequency] || '',
      'GÖREV': a.task?.title || '',
      'AÇIKLAMA': a.task?.description || '',
      'SONUÇ': sonuc
    };
  }) || [];

  const ws = XLSX.utils.json_to_sheet(reportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Görev Raporu');
  
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 25 }, { wch: 35 }, { wch: 15 }
  ];
  
  const fileName = `gorev_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};

// Gecikme badge'i hesapla
export const getDelayBadge = (assignedDate: string, completedAt: string | null) => {
  const assigned = new Date(assignedDate);
  
  if (!completedAt) {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return null;
    if (diffDays === 1) return { color: 'yellow', text: '1 gün gecikti' };
    return { color: 'red', text: `${diffDays} gün gecikti` };
  }
  
  const completed = new Date(completedAt);
  const diffDays = Math.floor((completed.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { color: 'green', text: 'Aynı gün' };
  if (diffDays === 1) return { color: 'yellow', text: '1 günde' };
  return { color: 'red', text: `${diffDays} günde` };
};





