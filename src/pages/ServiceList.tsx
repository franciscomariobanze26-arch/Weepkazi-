import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Globe, Clock, ChevronRight } from 'lucide-react';
import { query, collection, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceCard } from '../components/ServiceCard';
import { cn, handleFirestoreError, safeToMillis } from '../lib/utils';
import { OperationType, Service, UserProfile } from '../types';
import { MOZAMBIQUE_LOCATIONS } from '../constants';

export const ServiceList = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'price_asc' | 'price_desc'>('recent');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const uParam = params.get('u');
    const catParam = params.get('category');
    const provParam = params.get('province');
    
    if (qParam) setSearch(decodeURIComponent(qParam));
    if (uParam) setUserSearch(decodeURIComponent(uParam));
    if (catParam) setSelectedCategory(catParam);
    if (provParam) setSelectedProvince(provParam);
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userSearch) {
      setUserResults([]);
      return;
    }
    const q = query(
      collection(db, 'users'), 
      where('handle', '>=', userSearch), 
      where('handle', '<=', userSearch + '\uf8ff'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, [userSearch]);

  const filteredServices = services
    .filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                           s.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || s.category === selectedCategory;
      const matchesProvince = !selectedProvince || s.location?.province === selectedProvince;
      const matchesDistrict = !selectedDistrict || s.location?.district === selectedDistrict;
      const matchesPrice = s.price >= priceRange.min && s.price <= priceRange.max;
      
      return matchesSearch && matchesCategory && matchesProvince && matchesDistrict && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return safeToMillis(b.createdAt) - safeToMillis(a.createdAt);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-72 space-y-8">
          <div className="bg-white p-6 rounded-[32px] border border-brand-gray shadow-sm space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Pesquisa</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/40" />
                <input 
                  type="text" 
                  placeholder="Procurar @nome ou serviço..." 
                  value={search || userSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('@')) {
                      setUserSearch(val);
                      setSearch('');
                    } else {
                      setSearch(val);
                      setUserSearch('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Categoria</h3>
              <select 
                value={selectedCategory || ''} 
                onChange={e => setSelectedCategory(e.target.value || null)}
                className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
              >
                <option value="">Todas as Categorias</option>
                <option value="domestico">Doméstico</option>
                <option value="design">Design</option>
                <option value="aulas">Aulas</option>
                <option value="vendas">Vendas</option>
                <option value="transporte">Transporte</option>
                <option value="reparos">Reparos</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Localização</h3>
              <div className="space-y-3">
                <select 
                  value={selectedProvince || ''} 
                  onChange={e => {
                    setSelectedProvince(e.target.value || null);
                    setSelectedDistrict(null);
                  }}
                  className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                >
                  <option value="">Todas as Províncias</option>
                  {Object.keys(MOZAMBIQUE_LOCATIONS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {selectedProvince && (
                  <select 
                    value={selectedDistrict || ''} 
                    onChange={e => setSelectedDistrict(e.target.value || null)}
                    className="w-full p-3 bg-brand-bg rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold"
                  >
                    <option value="">Todos os Distritos</option>
                    {selectedProvince && MOZAMBIQUE_LOCATIONS[selectedProvince] && MOZAMBIQUE_LOCATIONS[selectedProvince].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Preço Máximo (MT)</h3>
              <input 
                type="range" 
                min="0" 
                max="100000" 
                step="500"
                value={priceRange.max}
                onChange={e => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                className="w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2 text-[10px] font-black text-brand-ink/40">
                <span>0 MT</span>
                <span>{priceRange.max.toLocaleString()} MT</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-4">Ordenar por</h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'recent', label: 'Mais Recentes' },
                  { id: 'rating', label: 'Melhor Avaliados' },
                  { id: 'price_asc', label: 'Menor Preço' },
                  { id: 'price_desc', label: 'Maior Preço' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as any)}
                    className={cn(
                      "text-left px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      sortBy === opt.id ? "bg-primary text-white shadow-md" : "hover:bg-brand-bg text-brand-ink/60"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {
                setSearch('');
                setSelectedCategory(null);
                setSelectedProvince(null);
                setSelectedDistrict(null);
                setPriceRange({ min: 0, max: 100000 });
                setSortBy('recent');
              }}
              className="w-full py-3 text-xs font-black text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
            >
              Limpar Filtros
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-8">
          {userResults.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-brand-gray shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink/40 mb-6">Utilizadores Encontrados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userResults.map(u => (
                  <Link 
                    key={u.uid} 
                    to={`/profile/${u.uid}`}
                    className="flex items-center space-x-4 p-4 bg-brand-bg rounded-2xl hover:bg-brand-gray transition-colors group"
                  >
                    <img 
                      src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                      className="w-12 h-12 rounded-xl object-cover" 
                    />
                    <div>
                      <p className="font-bold text-brand-ink group-hover:text-primary transition-colors">{u.displayName}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{u.handle || '@utilizador'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tighter">
              {filteredServices.length} {filteredServices.length === 1 ? 'Serviço Encontrado' : 'Serviços Encontrados'}
            </h2>
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] p-20 text-center border border-brand-gray border-dashed">
              <div className="w-20 h-20 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-brand-ink/20" />
              </div>
              <h3 className="text-xl font-black text-brand-ink mb-2">Nenhum serviço encontrado</h3>
              <p className="text-brand-ink/40 font-medium">Tenta ajustar os teus filtros ou pesquisa por algo diferente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
