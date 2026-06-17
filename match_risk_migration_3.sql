-- Allow authenticated users full access to match risk tables.
-- RLS is enabled by default in Supabase; without policies, all writes are blocked.

CREATE POLICY "Authenticated users can manage match risk assessments"
ON match_risk_assessments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage match risk history"
ON match_risk_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage match risk factor weights"
ON match_risk_factor_weights
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
