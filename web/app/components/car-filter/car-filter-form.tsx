"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


export default function CarFilterForm() {
  const router = useRouter();
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

  // Generate hardcoded years from 1950 to current year
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yearsArray: number[] = [];
    for (let year = currentYear; year >= 1950; year--) {
      yearsArray.push(year);
    }
    setYears(yearsArray);
  }, []);

  // Fetch makes on component mount
  useEffect(() => {
    const fetchMakes = async () => {
      try {
        setLoadingMakes(true);
        const res = await fetch(`${API_BASE}/api/car-data/makes`);
        const data = await res.json();
        
        if (data.ok) {
          setMakes(data.makes || []);
        }
      } catch (error) {
        console.error("Error fetching makes:", error);
        toast.error("Failed to load vehicle makes");
      } finally {
        setLoadingMakes(false);
      }
    };
    fetchMakes();
  }, [API_BASE]);

  // Reset selections when make changes
  useEffect(() => {
    if (!selectedMake) {
      setSelectedYear("");
      setModels([]);
      setSelectedModel("");
      return;
    }

    // When make changes, reset dependent fields (year and model)
    setSelectedYear("");
    setSelectedModel("");
  }, [selectedMake]);

  // Fetch models when make or year changes
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const url = `${API_BASE}/api/car-data/models?make=${encodeURIComponent(selectedMake)}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.ok) {
          const uniqueModels = Array.from(
            new Set(data.models?.map((m: any) => m.modelName) || [])
          ) as string[];
          setModels(uniqueModels);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        toast.error("Failed to load models");
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedMake, selectedYear, API_BASE]);

  const handleFindParts = () => {
    if (!selectedMake || !selectedModel || !selectedYear) {
      toast.error("Please select make, model, and year");
      return;
    }

    // Navigate to home with vehicle filters applied and scroll to products section
    const params = new URLSearchParams({
      make: selectedMake,
      model: selectedModel,
      year: selectedYear,
    });

    router.push(`/products?${params.toString()}`);
    toast("Searching for parts...");
  };

  return (
    <div className="text-white bg-[#FFA500] shadow-[0px_4px_4px_-1px_#2125290F] rounded-[18px] px-10 py-8 mx-[100px] relative -mt-[100px] z-20">
      <div className="border-b border-[rgba(255,255,255,0.3)] pb-8">
        <h3 className="text-[35px] font-bold mb-4">Find the right parts faster</h3>
        <p className="leading-[30px]">
          Search our extensive database of auto parts by selecting your vehicle&apos;s make, model, and year. 
          Get instant results for genuine and compatible parts for your specific vehicle.
        </p>
      </div>
      <div className="py-10 flex gap-4">
        {/* Make Dropdown */}
        <div className="w-1/4">
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            disabled={loadingMakes}
            className="bg-white text-black rounded-[10px] p-[15px] w-full disabled:opacity-50 cursor-pointer"
          >
            <option value="">
              {loadingMakes ? "Loading..." : "Select Make"}
            </option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </div>

        {/* Model Dropdown */}
        <div className="w-1/4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedMake || loadingModels}
            className="bg-white text-black rounded-[10px] p-[15px] w-full disabled:opacity-50 cursor-pointer"
          >
            <option value="">
              {loadingModels ? "Loading..." : "Select Model"}
            </option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        
        {/* Year Dropdown */}
        <div className="w-1/4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedMake}
            className="bg-white text-black rounded-[10px] p-[15px] w-full disabled:opacity-50 cursor-pointer"
          >
            <option value="">Select Year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Find Parts Button */}
        <div className="w-1/4">
          <button
            onClick={handleFindParts}
            disabled={!selectedMake || !selectedModel || !selectedYear}
            className="hover:bg-white transition-colors duration-300 hover:text-black cursor-pointer w-full h-full rounded-[10px] border-2 border-white capitalize disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Find auto parts
          </button>
        </div>
      </div>
    </div>
  );
}
