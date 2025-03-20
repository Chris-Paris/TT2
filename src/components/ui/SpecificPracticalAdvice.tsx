import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Button } from './button';
import { Input } from './input';
import { useToast } from './use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./dialog";
import { analytics } from '@/lib/analytics';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface SpecificPracticalAdviceProps {
  destination: string;
  language: 'en' | 'fr';
  practicalAdvice: string;
  onSaveAnswer?: (answer: string) => void;
}

export function SpecificPracticalAdvice({ destination, language, practicalAdvice, onSaveAnswer }: SpecificPracticalAdviceProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [answer, setAnswer] = useState('');

  const renderTextWithLinks = (text: string) => {
    // Handle Markdown-style links [text](url)
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const bulletRegex = /^\* (.+)$/gm;
    
    // First replace Markdown links with clickable links
    let processedText = text.replace(markdownRegex, (_, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${linkText}</a>`;
    });
    
    // Then handle any remaining plain URLs
    processedText = processedText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
    });

    // Handle bold text
    processedText = processedText.replace(boldRegex, '<strong>$1</strong>');

    // Handle bullet points
    processedText = processedText.replace(bulletRegex, '<div class="flex gap-2 items-start"><span class="mt-1.5">•</span><span>$1</span></div>');

    // Handle line breaks
    processedText = processedText.replace(/\n/g, '<br />');

    return (
      <div 
        className="text-sm whitespace-pre-wrap space-y-2"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' 
          ? 'Veuillez entrer une question'
          : 'Please enter a question',
        variant: "destructive",
      });
      return;
    }

    analytics.trackAskQuestion(destination);

    setIsLoading(true);
    try {
      const prompt = `You are a travel guide assistant for ${destination}. Answer the following specific question about the destination. Use the provided practical advice as context, but feel free to provide additional relevant information.

Context (Practical Advice):
${practicalAdvice}

Question: "${question}"

Format your response using these Markdown rules:
1. Use **bold** for important information and section titles
2. Use bullet points (*) for lists
3. Use [text](url) format for links
4. Use line breaks between sections

Your response should include:
* **Main Answer**
* **Additional Details**
* **Useful Tips**
* **Related Information**

${language === 'fr' ? 'Respond in French.' : 'Respond in English.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const answerText = response.text();
      
      setAnswer(answerText);
      setIsModalOpen(true);
      
      toast({
        title: language === 'fr' ? 'Réponse générée !' : 'Answer generated!',
        description: language === 'fr' 
          ? 'Voici la réponse à votre question.'
          : 'Here is the answer to your question.',
      });
    } catch (err) {
      console.error('Error generating answer:', err);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? 'Impossible de générer une réponse'
          : 'Unable to generate an answer',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex flex-col items-center gap-2 my-6">
          <p className="text-center text-muted-foreground mb-2">
            {language === 'fr' ? 'Des questions spécifiques ?' : 'Any specific questions?'}
          </p>
          <div className="flex gap-3 justify-center">
            <Input
              type="text"
              placeholder={language === 'fr' ? 'Vaccins, visas, sécurité ...' : 'Vaccines, visas, security...'}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="max-w-md w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  askQuestion();
                }
              }}
            />
            <Button
              onClick={askQuestion}
              disabled={isLoading}
              className="whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{language === 'fr' ? 'Génération...' : 'Generating...'}</span>
                </>
              ) : (
                <span>{language === 'fr' ? 'Envoyer' : 'Ask'}</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle>
              {language === 'fr' ? 'Réponse' : 'Answer'}
            </DialogTitle>
            <div className="absolute right-0 top-0 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  if (onSaveAnswer) {
                    onSaveAnswer(answer);
                    toast({
                      title: language === 'fr' ? 'Réponse sauvegardée !' : 'Answer saved!',
                      description: language === 'fr' 
                        ? 'La réponse a été ajoutée aux conseils pratiques.'
                        : 'The answer has been added to the practical advice.',
                    });
                  }
                }}
              >
                {language === 'fr' ? 'Sauvegarder' : 'Save'}
              </Button>
              <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted rounded-md">
            {renderTextWithLinks(answer)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}