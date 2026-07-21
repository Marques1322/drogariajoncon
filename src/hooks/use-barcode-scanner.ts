import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface UseBarcodeResult {
  barcode: string;
  isScanning: boolean;
  clearBarcode: () => void;
  setBarcode: (code: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Hook para capturar entrada de códigos de barras via leitor USB/Bluetooth
 * O leitor deve estar configurado para enviar o código seguido de ENTER
 */
export function useBarcodeScanner(onBarcodeScanned?: (barcode: string) => void): UseBarcodeResult {
  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // Foca automaticamente no input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Não captura se está digitando em outro campo
      if (event.target !== inputRef.current && inputRef.current !== document.activeElement) {
        return;
      }

      // Teclas de controle não são parte do barcode
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key === "Tab" ||
        event.key === "Shift" ||
        event.key === "CapsLock"
      ) {
        return;
      }

      // ESC limpa o barcode
      if (event.key === "Escape") {
        event.preventDefault();
        setBarcode("");
        clearTimeout(barcodeTimeoutRef.current ?? undefined);
        return;
      }

      // ENTER confirma a leitura
      if (event.key === "Enter") {
        event.preventDefault();
        if (barcode.trim().length > 0) {
          setIsScanning(true);
          onBarcodeScanned?.(barcode.trim());
          // Mantém o barcode visível por um moment antes de limpar
          setTimeout(() => {
            setBarcode("");
            setIsScanning(false);
          }, 300);
        }
        clearTimeout(barcodeTimeoutRef.current ?? undefined);
        return;
      }

      // Qualquer outro caractere é adicionado ao barcode
      if (!isScanning) {
        const char = event.key;

        // Verifica se é um caractere imprimível
        if (char.length === 1 && !event.ctrlKey && !event.altKey) {
          event.preventDefault();

          // Marca o início da leitura
          if (barcode === "") {
            scanStartTimeRef.current = Date.now();
          }

          // Adiciona o caractere
          setBarcode((prev) => prev + char);

          // Reinicia o timeout de detecção de fim de leitura
          clearTimeout(barcodeTimeoutRef.current ?? undefined);

          // Se passou 100ms sem novos caracteres, considera fim da leitura
          // (leitores USB geralmente finalizam com ENTER)
          barcodeTimeoutRef.current = setTimeout(() => {
            if (barcode.length > 2) {
              // Apenas auto-submete se tiver conteúdo suficiente
              // Normalmente o leitor envia ENTER no final
            }
          }, 100);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(barcodeTimeoutRef.current ?? undefined);
    };
  }, [barcode, isScanning, onBarcodeScanned]);

  const clearBarcode = () => {
    setBarcode("");
    clearTimeout(barcodeTimeoutRef.current ?? undefined);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return {
    barcode,
    isScanning,
    clearBarcode,
    setBarcode,
    inputRef,
  };
}
