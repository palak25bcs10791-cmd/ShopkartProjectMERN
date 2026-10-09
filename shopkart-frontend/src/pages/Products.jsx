import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../services/products';
import api from '../services/api';

const categories = ['Electronics', 'Fashion', 'Books', 'Home'];

function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingProductId, setSavingProductId] = useState(null);

  useEffect(() => {
    api.get('/wishlist')
      .then(({ data }) => setWishlist(Array.isArray(data.wishlist) ? data.wishlist.map((item) => item._id || item) : []))
      .catch(() => setWishlist([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(false);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (sort) params.sort = sort;

      try {
        const { data } = await getProducts(params, controller.signal);
        setProducts(data.products);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, category, sort]);

  async function handleToggleWishlist(product) {
    const isSaved = wishlist.includes(product._id);
    setSavingProductId(product._id);
    try {
      if (isSaved) {
        await api.delete(`/wishlist/${product._id}`);
        setWishlist((current) => current.filter((id) => id !== product._id));
      } else {
        const { data } = await api.post('/wishlist', { productId: product._id });
        setWishlist(Array.isArray(data.wishlist) ? data.wishlist.map((item) => item._id || item) : [...wishlist, product._id]);
      }
    } finally {
      setSavingProductId(null);
    }
  }

  return <div className="app-shell"><Navbar /><main className="catalog-page">
    <div className="catalog-heading">
      <div><p className="eyebrow">THE SHOPKART EDIT</p><h1>Find your next favorite.</h1></div>
      <p className="catalog-note">Useful things, good finds, all in one place.</p>
    </div>
    <section className="catalog-controls" aria-label="Product search and filters">
      <label className="search-control">Search products
        <input type="search" placeholder="Try “headphones”" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <label>Category
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Sort by
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="">Recently added</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
    </section>
    {isLoading ? <p className="catalog-state" role="status">Loading products...</p>
      : error ? <p className="catalog-state catalog-error" role="alert">Something went wrong while loading products.</p>
        : products.length === 0 ? <p className="catalog-state">No products found.</p>
          : <>
            <p className="result-count">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
            <section className="product-grid" aria-label="Products">
              {products.map((product) => <ProductCard
                key={product._id}
                product={product}
                isSaved={wishlist.includes(product._id)}
                isSaving={savingProductId === product._id}
                onToggleWishlist={handleToggleWishlist}
              />)}
            </section>
          </>}
  </main></div>;
}

export default Products;