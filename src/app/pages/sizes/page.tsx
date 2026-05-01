export default function SizesPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Таблиця розмірів</h1>
      <div className="max-w-4xl overflow-x-auto">
        <table className="w-full text-left text-[14px] lg:text-[16px]">
          <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-6 py-4">Розмір</th>
              <th className="px-6 py-4">Зріст (см)</th>
              <th className="px-6 py-4">Вік</th>
              <th className="px-6 py-4">Обхват грудей (см)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-6 py-4 font-medium">104</td><td className="px-6 py-4">99-104</td><td className="px-6 py-4">3-4 роки</td><td className="px-6 py-4">55-57</td></tr>
            <tr><td className="px-6 py-4 font-medium">110</td><td className="px-6 py-4">105-110</td><td className="px-6 py-4">4-5 років</td><td className="px-6 py-4">57-59</td></tr>
            <tr><td className="px-6 py-4 font-medium">116</td><td className="px-6 py-4">111-116</td><td className="px-6 py-4">5-6 років</td><td className="px-6 py-4">59-61</td></tr>
            <tr><td className="px-6 py-4 font-medium">122</td><td className="px-6 py-4">117-122</td><td className="px-6 py-4">6-7 років</td><td className="px-6 py-4">61-63</td></tr>
            <tr><td className="px-6 py-4 font-medium">128</td><td className="px-6 py-4">123-128</td><td className="px-6 py-4">7-8 років</td><td className="px-6 py-4">63-66</td></tr>
            <tr><td className="px-6 py-4 font-medium">134</td><td className="px-6 py-4">129-134</td><td className="px-6 py-4">8-9 років</td><td className="px-6 py-4">66-69</td></tr>
            <tr><td className="px-6 py-4 font-medium">140</td><td className="px-6 py-4">135-140</td><td className="px-6 py-4">9-10 років</td><td className="px-6 py-4">69-72</td></tr>
            <tr><td className="px-6 py-4 font-medium">146</td><td className="px-6 py-4">141-146</td><td className="px-6 py-4">10-11 років</td><td className="px-6 py-4">72-75</td></tr>
            <tr><td className="px-6 py-4 font-medium">152</td><td className="px-6 py-4">147-152</td><td className="px-6 py-4">11-12 років</td><td className="px-6 py-4">75-78</td></tr>
            <tr><td className="px-6 py-4 font-medium">158</td><td className="px-6 py-4">153-158</td><td className="px-6 py-4">12-13 років</td><td className="px-6 py-4">78-81</td></tr>
            <tr><td className="px-6 py-4 font-medium">164</td><td className="px-6 py-4">159-164</td><td className="px-6 py-4">13-14 років</td><td className="px-6 py-4">81-84</td></tr>
            <tr><td className="px-6 py-4 font-medium">170</td><td className="px-6 py-4">165-170</td><td className="px-6 py-4">14+ років</td><td className="px-6 py-4">84-87</td></tr>
            <tr><td className="px-6 py-4 font-medium">176</td><td className="px-6 py-4">171-176</td><td className="px-6 py-4">14+ років</td><td className="px-6 py-4">87-90</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
